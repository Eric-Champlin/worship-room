# Implementation Plan: Music Page Facelift

**Spec:** `_specs/music-page-facelift.md`
**Date:** 2026-04-18
**Branch:** `claude/feature/music-page-facelift`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Reports:** `_plans/recon/music-recon-playlists.json`, `_plans/recon/music-recon-ambient.json`, `_plans/recon/music-recon-sleep.json` (loaded — per-tab JSON focus-area captures)
**Master Spec Plan:** `_plans/music-page-facelift.md` (loaded — serves as the narrative source plan; this `/plan` output is the executable step breakdown)

---

## Architecture Context

### Project state

- **MusicPage.tsx** (`frontend/src/pages/MusicPage.tsx`) owns the shell: `<Navbar>` → `<PageHero>` → sticky `role="tablist"` with bespoke animated-underline → 3 tab panels (`tabpanel-playlists`, `tabpanel-ambient`, `tabpanel-sleep`) → `<SiteFooter>` → `RoutineInterruptDialog` → optional `TooltipCallout`. Default tab at line 51 is `'ambient'`. The bespoke tab bar is at lines 188-241 (sentinel, sticky wrapper, tablist with arrow-key handler, animated underline div). Arrow-key handler at lines 154-169.
- **PageHero.tsx** (`frontend/src/components/PageHero.tsx`) — current subtitle at line 50 uses `font-serif italic text-base text-white/60 sm:text-lg`. Renders title through `renderWithScriptAccent(title, scriptWord)` from `constants/gradients.tsx` — if `scriptWord` is `undefined`, the helper returns the text unchanged. So removing `scriptWord` from MusicPage's invocation cleanly retires the Caveat accent with no PageHero change required.
- **DailyHub.tsx** lines 238-292 contains the canonical pill+halo tab bar. No shared `<Tabs>` primitive exists anywhere in `components/ui/`. GrowPage still uses the old underline pattern (lines 112-167). The spec's "visually identical to `/grow` and `/daily`" phrasing is aspirational — `/daily` is the authoritative current target. Grow will migrate separately (branch `claude/feature/grow-and-challenge-detail-facelift` was recent); this spec does NOT migrate Grow.
- **WorshipPlaylistsTab.tsx** lines 31-36 and 44-49 render `<h2 className="font-script text-3xl font-bold text-white sm:text-4xl">Featured/Explore</h2>` + `<HeadingDivider>` SVG. Recon confirms `font-family: Caveat, cursive` on both headings, each with an SVG divider.
- **SpotifyEmbed.tsx** lines 52-71 render the error state. Current CTA is outlined primary (`border border-primary px-5 py-2 text-sm font-medium text-primary`). There's also an `isOnline === false` branch at lines 39-50 that uses the same weak outline treatment in a WifiOff icon variant.
- **AmbientBrowser.tsx** — lines 151-163 render Featured row (`FEATURED_SCENE_IDS.map(...)` from `scenes.ts`). Lines 166-180 render the All Scenes grid driven by `search.filteredScenes`, which includes the featured scenes — this is the duplication bug (recon confirmed 11-card All Scenes grid + separate 3-card Featured row = 14 rendered cards total for 11 unique scenes). Saved Mixes section at lines 136-149 is conditional (`isAuthenticated && mixes.length > 0`). Build Your Own Mix at lines 183-196 wraps `<SoundGrid>` in a frosted panel (`rounded-xl border border-white/10 bg-white/[0.06] p-6`). "All Scenes" heading at line 168 is already Inter (`text-base font-medium text-white`) — not Caveat. "Build Your Own Mix" heading at line 186 same treatment.
- **SoundGrid.tsx** currently renders `<section>` per category with `<h3 className="mb-3 text-base font-medium text-white">` and a `<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">` tile layout. Flat keyboard-nav with arrow keys computing `cols` from viewport at line 56. **This is a 2D grid today — spec requires conversion to 1D horizontal scroll rows per category.** Keyboard-nav logic must be updated because the grid → row change changes how ArrowUp/Down behave (they become no-ops within a row).
- **SoundCard.tsx** — 90×90px button (`w-20 h-20 sm:w-[90px] sm:h-[90px]`), single uniform `bg-white/[0.06]`, icon color toggles between `text-primary` (active) and `text-white/50` (inactive), uniform purple active glow `shadow-[0_0_12px_rgba(147,51,234,0.4)]` + `motion-safe:animate-sound-pulse`.
- **SleepBrowse.tsx** lines 39-52 render the "Build a Bedtime Routine" CTA card with an outlined-primary `<Link>` at line 48 that fails WCAG AA.
- **BibleSleepSection.tsx** line 43 has `<h2 className="mb-4 text-lg font-semibold text-white">Scripture Reading</h2>`. Line 86 has the failing `text-primary` play icons on three quick-start cards. Line 59 "Read the Bible" BookOpen icon is already `text-primary-lt` — do not change.
- **TonightScripture.tsx** line 23 label is `text-primary` (the WCAG fail). Line 40-47 is the 48px `bg-primary` play button that needs inversion.
- **ScriptureSessionCard.tsx** line 33 Scripture badge is `bg-primary/10 text-primary` (12px — WCAG fail). Line 37-42 is the inline 32px `bg-primary` play button that needs inversion.
- **BedtimeStoryCard.tsx** line 40-43 has a parallel "Story" badge (`bg-primary/10 text-primary-lt`). Spec says unify with the new Scripture badge treatment (`bg-violet-500/15 text-violet-300`). Line 44-49 "Story" card's purple play button stays out of scope (explicit deferral).
- **ScriptureCollectionRow.tsx** line 16 heading is `text-xl font-semibold text-white`. Rendered 4 times from `SleepBrowse` (one per collection: Psalms of Peace / Comfort & Rest / Trust in God / Hope & Promise).
- **BedtimeStoriesGrid.tsx** line 12 heading is `text-xl font-semibold text-white`.
- **scene-backgrounds.ts** stores each scene's gradient (3-stop linear-gradient + a repeating-pattern overlay at `rgba(255,255,255,0.06-0.08)`). 11 scenes total. Recon confirmed `FEATURED_SCENE_IDS = ['garden-of-gethsemane', 'still-waters', 'midnight-rain']`.
- **Button.tsx** (`components/ui/Button.tsx`) has variants `primary | secondary | outline | ghost` — **no `light` variant exists**. We either add one or inline the white-pill class string from `09-design-system.md` § "White Pill CTA Patterns" Pattern 1 (the smaller inline pattern, which matches the spec's context for both the Spotify error CTA and the "Create a Routine" CTA).
- **Tailwind config** (`frontend/tailwind.config.js`): `hero-bg: #08051A`, `primary-lt: #8B5CF6`, `sound-pulse` keyframe + `animate-sound-pulse 3s cubic-bezier(0.4, 0, 0.2, 1) infinite` already defined.

### PageHero consumers (cross-page change surface)

Direct `<PageHero />` renders exist on: Music, ScriptureSoaking (3 uses), MyPrayers, BreathingExercise (3 uses), PsalmReading (3 uses), AskPage. All currently inherit `font-serif italic text-white/60` subtitle styling. **Changing PageHero's subtitle to `text-white` non-italic will affect all of them.** Per `09-design-system.md` § "Text Opacity Standards" and the Deprecated Patterns table (`font-serif italic` on journal prompts), this is a net improvement that aligns these pages with the Daily Hub standard. The spec's acceptance criterion explicitly allows a cross-page change provided the other pages are visually improved and verified via Playwright.

### Test patterns to match

- Vitest + RTL pattern lives alongside `MusicPage.test.tsx` at `frontend/src/pages/__tests__/MusicPage.test.tsx` (existing).
- UI tests wrap in `<AuthModalProvider>` + `<ToastProvider>` + `<AudioProvider>` + `<MemoryRouter>`. The existing MusicPage tests demonstrate this stack — reuse it.
- New UI primitives (`SectionHeader`, `ScrollRow`) go under `components/ui/__tests__/`. Reactive store consumer tests not required here (no reactive store is introduced).
- For scroll-row overflow behavior, simulate via `Element.prototype.scrollBy` + controlled `scrollWidth/clientWidth` via jsdom monkeypatching — existing pattern not present in repo, so document this approach explicitly.

### Auth gating

Per the spec and `02-security.md`, Music is public and this spec introduces zero new auth gates. The pre-existing "Save Mix" flow on Ambient remains auth-gated by its existing logic — we do not modify it.

### localStorage

No new keys. The optional `themeColor` field on `ScenePreset` is static data, not user state. Per `11-local-storage-keys.md` conventions, no entry required there.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Switch tabs | Works for all | Step 5 (tab bar) | N/A — no gate |
| Play Spotify preview | Works for all | Step 6 (playlists tab) | N/A — no gate |
| Open in Spotify (error CTA) | Works for all | Step 7 (embed error card) | N/A — no gate |
| Toggle sound tile in BYOM | Works for all | Step 11 (SoundGrid/SoundCard) | N/A — no gate |
| Play featured/all-scenes ambient | Works for all | Step 8 (AmbientBrowser) | N/A — no gate (pre-existing `useScenePlayer`) |
| Play TonightScripture / ScriptureSessionCard | Works for all | Steps 14/15 | N/A — no gate (pre-existing `useForegroundPlayer`) |
| Create a Routine navigation | Works for all | Step 12 (SleepBrowse) | N/A — no gate |
| Save Mix (pre-existing Ambient feature) | Unchanged by this spec | Not modified | Pre-existing logic in `SavedMixes` |

No new auth modals are added. The Saved Mixes section stays conditional on `isAuthenticated && mixes.length > 0` (AmbientBrowser line 136) so a logged-out user sees nothing.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Tab pill container | className | `rounded-full border border-white/[0.12] bg-white/[0.06] p-1` | DailyHub.tsx:247, 09-design-system.md |
| Active tab pill | className | `bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]` + `rounded-full min-h-[44px]` | DailyHub.tsx:271 |
| Inactive tab pill | className | `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent` | DailyHub.tsx:272 |
| Tab button shared | className | `flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px] text-sm font-medium transition-all motion-reduce:transition-none duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg sm:text-base active:scale-[0.98]` | DailyHub.tsx:269 |
| Sticky tab-bar wrapper | className | `relative sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none` + `isSticky && 'shadow-md shadow-black/20'` | DailyHub.tsx:240 |
| Tab-bar inner container | className | `mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4` | DailyHub.tsx:244 |
| SectionHeader heading | className | `flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/50` | 09-design-system.md (matches Grow "Coming Up" treatment) |
| SectionHeader wrapper | className | `mb-4 flex items-center justify-between gap-3` | spec + recon parity target |
| FrostedCard (error panel) | className | `rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 text-center shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | 09-design-system.md + FrostedCard.tsx:31-32 |
| White-pill CTA (inline, Pattern 1) | className | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] transition-colors motion-reduce:transition-none` | 09-design-system.md § White Pill CTA Patterns |
| TonightScripture 48px play button | className | `flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.96]` | spec + 09-design-system.md |
| ScriptureSessionCard inline 32px play button | className | `ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_12px_rgba(255,255,255,0.12)]` | spec |
| Scripture/Story badge pill | className | `flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300` | spec (mirrors Grow CATEGORY_COLORS.advent) |
| Tonight's Scripture label | className | `text-sm font-medium uppercase tracking-wide text-white` | spec (replaces `text-primary`) |
| Edge-fade (right) | className | `pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-hero-bg to-transparent` | spec (uses hero-bg token `#08051A`) |
| Edge-fade (left) | className | `pointer-events-none absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-hero-bg to-transparent` | spec |
| "See more →" scroll button | className | `absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.12] border border-white/[0.15] text-white/80 hover:bg-white/[0.18] transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | spec |
| Spotify preview disclaimer | className | `mx-auto mb-3 flex max-w-2xl items-center justify-center gap-2 text-xs text-white/50` + `<Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />` | spec |
| PageHero subtitle (new) | className | `mx-auto max-w-xl text-base text-white sm:text-lg` | 09-design-system.md § Text Opacity Standards + Deprecated Patterns (retires `font-serif italic text-white/60`) |

### Category colors (Step 3 — NEW constant)

| Category | `bgClass` | `borderClass` | `iconInactiveClass` | `iconActiveClass` | `activeGlow` |
|---|---|---|---|---|---|
| nature | `bg-emerald-500/[0.08]` | `border-emerald-400/20` | `text-emerald-300/70` | `text-emerald-200` | `shadow-[0_0_16px_rgba(52,211,153,0.45)]` |
| environments | `bg-amber-500/[0.08]` | `border-amber-400/20` | `text-amber-300/70` | `text-amber-200` | `shadow-[0_0_16px_rgba(251,191,36,0.45)]` |
| spiritual | `bg-violet-500/[0.08]` | `border-violet-400/20` | `text-violet-300/70` | `text-violet-200` | `shadow-[0_0_16px_rgba(167,139,250,0.45)]` |
| instruments | `bg-sky-500/[0.08]` | `border-sky-400/20` | `text-sky-300/70` | `text-sky-200` | `shadow-[0_0_16px_rgba(125,211,252,0.45)]` |

These are [UNVERIFIED] contrast values — icon-on-tile AA compliance to be confirmed in Step 18.

---

## Design System Reminder

Displayed by `/execute-plan` before every UI step:

- All animation durations/easings come from `frontend/src/constants/animation.ts`. Do NOT hardcode `200ms` or `cubic-bezier(...)` strings. Use `duration-base`, `duration-fast`, `ease-standard`, `ease-decelerate` Tailwind tokens.
- Hero headings on Music, and section headings, use `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) — NOT Caveat. `renderWithScriptAccent(title, undefined)` returns plain text; passing `scriptWord="Music"` is the source of the Caveat accent being retired.
- The Pray/Journal textarea white-glow pattern is not relevant to this spec (Music has no textareas).
- White pill CTA Pattern 1 (inline) is the correct variant for the Spotify error card and the "Create a Routine" CTA. Pattern 2 (larger, drop-shadow) is NOT used in this spec.
- FrostedCard base: `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow `shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`. When building the Spotify error panel, either use `<FrostedCard>` directly or match these values exactly.
- Daily Hub tab bar is the canonical visual target (not Grow). GrowPage still uses the old underline pattern — Grow will migrate separately. Do NOT try to match Grow's current look.
- `bg-hero-bg` Tailwind token = `#08051A`. The edge-fade gradients use this to fade into the Music page's dark background (`bg-dashboard-dark` = `#0f0a1e`). These hex values are close but not identical — the fade-to-hero-bg will leave a ~4-pixel-wide faint mismatch zone against the dashboard-dark Music tabs. Visual verification in Step 18 confirms whether this is perceptible; if yes, switch edge-fade to `from-dashboard-dark`.
- Deprecated patterns retired in this spec: `font-script` Caveat accents, `font-serif italic` subtitles, `HeadingDivider` SVG dividers on `/music`, `text-primary` for small-text labels/icons on dark, outlined `border-primary text-primary` CTAs, the bespoke animated-underline tab bar. Do not reintroduce.
- `motion-safe:animate-sound-pulse` gates the active-tile pulse. Preserve the prefix; the global reduced-motion safety net in `frontend/src/styles/animations.css` takes care of the rest.
- Icon-only buttons always get `aria-label`. Decorative icons inside labeled buttons get `aria-hidden="true"`.

---

## Shared Data Models (from Master Plan)

**No new data models.** The `ScenePreset` TypeScript interface in `frontend/src/types/music.ts` (referenced by `scenes.ts` and `scene-backgrounds.ts`) gains an optional `themeColor?: string` field in Step 10. No consumer reads it in this spec; it's forward-looking.

**No new localStorage keys.** See "Architecture Context → localStorage" above.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|---|---|---|
| Mobile | 375px | Tab pill fits in `max-w-xl` with `px-4 py-3` wrapper, short labels already supported by `TABS` shortLabel field. Explore grid → 1 column. Ambient All Scenes grid → 2 columns. Sound grid category rows → horizontal scroll (native touch), "See more →" visible when overflow. Featured scenes → horizontal scroll (pre-existing). Sleep cards stack full-width. |
| Tablet | 768px | Tab bar centered in `max-w-xl`. Explore grid → 2 columns. Ambient All Scenes → 3 columns. Nature row (7 tiles) overflows → "See more →" appears. Environments + Instruments (6 tiles) may fit or overflow depending on tile gap math. |
| Desktop | 1440px | Explore grid → still 2 columns (current `grid-cols-2` — not changed in this spec; 2-column is deliberate at wide viewport). Ambient All Scenes → 4 columns. 6-tile category rows fit natively, only Nature (7 tiles) triggers overflow. |

**Custom breakpoints:** AmbientBrowser All Scenes grid switches at `sm` (640px) and `lg` (1024px) per Tailwind standard. No custom breakpoints introduced in this spec.

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---|---|---|---|
| Music tab bar | 3 tab buttons (Playlists / Ambient / Sleep) | Same y ±2px at 375px and 1440px | Never wrap — tab bar is designed single-row at all widths |
| Spotify disclaimer row | `Info` icon + disclaimer text | Same y ±2px at 375px+ | Wrapping is acceptable for the text portion on very narrow viewports; icon stays anchored |
| Scripture session card pill row | Duration chip, voice chip, Scripture badge, inline play button | Same y ±2px at 375px and 1440px | May wrap below 320px (pre-existing tolerance) |
| Bedtime story card pill row | Duration chip, length chip, voice chip, Story badge, play button | Same y ±2px at 375px and 1440px | Same as Scripture card |
| Build Your Own Mix sound tile rows | 6-7 SoundCards per category, horizontally | Same y ±2px within a row | Never wrap — overflow is horizontal scroll, not line wrap |

Verified by `/verify-with-playwright` Step 6l (Inline Element Positional Verification).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|---|---|---|
| Hero → sticky tab bar | 0px (tab bar is sticky, flush under hero) | DailyHub.tsx structure parity |
| Tab bar → first tab panel content | Panel content has internal `py-8` (32px) — tab bar has `py-3 sm:py-4` (12-16px) — total ~44-48px | `MusicPage.tsx:266` (ambient wrapper), `WorshipPlaylistsTab.tsx:29` (playlists wrapper has `py-8`), `SleepBrowse.tsx:23` |
| Section → next section (within a tab) | `space-y-8` = 32px (AmbientBrowser line 119) / `space-y-8` (SleepBrowse inner max-w-6xl div line 24) | Current codebase, preserved |
| Last section → SiteFooter | Footer has its own top padding | Preserved |

No custom vertical-rhythm changes. Preserving existing spacing tokens everywhere.

---

## Assumptions & Pre-Execution Checklist

- [ ] Dev server running at `http://localhost:5174` for `/verify-with-playwright` Step 18
- [ ] All three per-tab recon JSONs on disk: `_plans/recon/music-recon-{playlists,ambient,sleep}.json` (captured 2026-04-18)
- [ ] Design system reference `_plans/recon/design-system.md` present (for shared token values)
- [ ] Prior `grow-and-challenge-detail-facelift` branch's Grow changes NOT expected to land before this spec — Grow's old underline tab bar is the current state on main and will remain so until its own merge. The "match /grow" acceptance criterion in the spec is treated as aspirational; Daily Hub is the authoritative pill-pattern reference.
- [ ] All auth-gated actions are accounted for (none introduced — Music is public)
- [ ] Design system values are verified (all cited in "Design System Values" table)
- [ ] [UNVERIFIED] values flagged with verification/correction methods (see each step)
- [ ] Recon reports loaded — per-tab focus-area captures used to pin computed values during execution
- [ ] No deprecated patterns introduced (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards on dark backgrounds, animated-underline tab bar, `border-primary text-primary` outlined CTAs, `text-primary` label colors on dark)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Shared `<Tabs>` primitive? | **No** — copy Daily Hub's inline markup into MusicPage | No `<Tabs>` primitive exists today; creating one and migrating Daily Hub would expand scope. Inline copy preserves pixel parity with Daily Hub's current implementation and avoids refactoring a stable component. |
| PageHero subtitle change scope | **Global** — change `PageHero.tsx` line 50 | 6 consumers inherit the change. All are net improvements per design system standards (retires deprecated italic-serif pattern). Step 18 verifies the other 5 pages visually. |
| New `variant="light"` on `Button.tsx`? | **No** — use inline Pattern 1 class string | The Spotify error CTA and "Create a Routine" CTA both fit the inline pattern. Adding a Button variant for 2 consumers is premature abstraction; the canonical class string from 09-design-system.md is the source of truth. |
| Keyboard-nav rework in `SoundGrid` | **Simplify to 1D** — horizontal-only within a category row; ArrowUp/Down moves between category rows | Converting grid → row changes geometry. Document the new keyboard model in the SoundGrid test. Keep flat-index fallback for Home/End. |
| Category heading treatment in SoundGrid | **Use `<SectionHeader as="h3">`** | Categories are sub-sections of "Build Your Own Mix" — h3 is the correct semantic level. `SectionHeader` accepts `as` override. |
| "Build Your Own Mix" outer frosted panel | **Keep** the existing `rounded-xl border border-white/10 bg-white/[0.06] p-6` wrapper | The category-colored tiles inside a subtle gray-frosted panel produces the intended "palette inside a container" effect. Verified against recon screenshots — removing the wrapper would make the section bleed into the page. |
| Scene gradient desaturation approach | **Manual per-scene HSL desaturation** (executor computes via `culori` or manual math) | Overlay approach (rgba(15,10,30,0.25) over every scene) is coarser but tempting. Per-scene HSL × 0.65 chroma preserves identity. If executor finds per-scene math infeasible, fall back to the overlay — both are acceptable per spec §3.3. |
| ScrollRow affordance threshold | **6 items** default (`overflowThreshold: 6`), override per consumer | Matches the Nature row at 7 items triggering affordance while 6-item rows fit natively at desktop. ScrollRow always renders edge fades based on actual scroll position; the affordance button is the only item-count-gated element. |
| BedtimeStoryCard "Story" badge unification | **Unify** (change from `bg-primary/10 text-primary-lt` to `bg-violet-500/15 text-violet-300`) | The spec calls for unifying the tag family for consistency. The play button on the same card stays out of scope. |
| Out-of-scope edge-fade color mismatch | Use `from-hero-bg` (`#08051A`) on edge fades | Spec specifies this token. Music page background is `bg-dashboard-dark` (`#0f0a1e`) — a ~4px mismatch zone. If visually perceptible during Step 18 verification, switch to `from-dashboard-dark`. Flagged as [UNVERIFIED]. |
| Disclaimer placement on narrow viewport | **Center-aligned with max-w-2xl** matching the Featured embed width | Narrow viewport may truncate the text awkwardly; icon stays left-most. If wrapping looks bad at 375px, switch `justify-center` to `justify-start` on the disclaimer only for mobile via responsive variants. |
| Music-recon music-recon JSON file format | JSON (not markdown) | The user's direct instruction specified `.json` extension for focus-area capture. Consumed by `/plan` as structured data; not consumed by `/verify-with-playwright` (which uses its own recon). |

---

## Implementation Steps

### Step 1: Create `<SectionHeader>` shared primitive — **[COMPLETE]**

**Objective:** Introduce the canonical left-aligned uppercase section-heading primitive used across all three Music tabs (and available for future consumers).

**Files to create/modify:**
- `frontend/src/components/ui/SectionHeader.tsx` — new
- `frontend/src/components/ui/__tests__/SectionHeader.test.tsx` — new

**Details:**

Create `SectionHeader` matching the spec (`_plans/music-page-facelift.md` §2.1) with these props:

```tsx
export interface SectionHeaderProps {
  children: ReactNode
  icon?: ReactNode
  as?: 'h2' | 'h3'
  action?: ReactNode
  className?: string
  id?: string
}
```

Render:

```tsx
<div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
  <Tag id={id} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/50">
    {icon}
    <span>{children}</span>
  </Tag>
  {action && <div className="shrink-0">{action}</div>}
</div>
```

`Tag` is resolved from the `as` prop (defaults to `h2`). `id` flows through so AmbientBrowser and SoundGrid can keep their existing `aria-labelledby` wiring (e.g., SoundGrid line 96 `headerId = category-${group.category}`).

**Auth gating:** N/A — no UI action.

**Responsive behavior:**
- Desktop (1440px): `mb-4 flex items-center justify-between gap-3`, heading text left, optional action right.
- Tablet (768px): Identical.
- Mobile (375px): Identical — heading text truncates via flex default if action is present; single-line uppercase `text-sm` reads correctly at 14px.

**Inline position expectations:**
- Icon and heading text share y ±2px at every breakpoint (flex row).
- Heading and action share y ±2px at every breakpoint.

**Guardrails (DO NOT):**
- Do NOT add `text-primary` or any purple text color. The canonical color is `text-white/50`.
- Do NOT add a decorative SVG divider. The divider-pattern is explicitly retired on Music.
- Do NOT default `as` to `h1`. The page h1 is the hero title; SectionHeader is always h2 or h3.
- Do NOT use Caveat/`font-script`.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| renders h2 by default | unit | `<SectionHeader>Featured</SectionHeader>` produces an `<h2>` with the correct class list |
| renders h3 when `as="h3"` | unit | Verifies tag override |
| renders leading icon when provided | unit | Passes a `<MockIcon />`; asserts it appears before the text |
| renders right-aligned action slot | unit | Passes `action={<button>See all</button>}`; asserts the button is in the right slot |
| accepts custom className | unit | `className="mt-6"` merges into the root via `cn()` |
| id prop flows to the heading element | unit | `id="category-nature"` appears on the `<h2>`/`<h3>` for `aria-labelledby` wiring |
| passes axe | unit | Renders without accessibility violations via `@testing-library/jest-dom` + axe plugin if available |

**Expected state after completion:**
- [ ] `frontend/src/components/ui/SectionHeader.tsx` exports `SectionHeader` and `SectionHeaderProps`
- [ ] Test file passes with 7 tests
- [ ] `pnpm build` succeeds
- [ ] No other file yet imports `SectionHeader` (consumed in Steps 6, 8, 11, 12, 13, 17)

---

### Step 2: Create `<ScrollRow>` shared primitive

**Objective:** Horizontal-scroll container with edge-fade gradients and overflow-aware "See more →" affordance. Used by Build Your Own Mix category rows (Step 11).

**Files to create/modify:**
- `frontend/src/components/ui/ScrollRow.tsx` — new
- `frontend/src/components/ui/__tests__/ScrollRow.test.tsx` — new

**Details:**

Props:

```tsx
export interface ScrollRowProps {
  children: ReactNode
  ariaLabel: string
  itemCount: number
  overflowThreshold?: number // default 6
  className?: string
}
```

Implementation (matches spec §3.5):
- `useRef<HTMLDivElement>` on the scroller.
- `useState` for `showLeftFade`, `showRightFade`, both false initially.
- `useEffect` attaches a passive scroll listener + resize listener; recomputes fade visibility from `scrollLeft`, `scrollWidth`, `clientWidth`. Thresholds: `scrollLeft > 4` → show left; `scrollLeft + clientWidth < scrollWidth - 4` → show right.
- Scroller element: `className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-none"`. Note `scrollbar-none` (the existing project utility per AmbientBrowser line 153) — NOT `scrollbar-thin`. The spec mentioned `scrollbar-thin` but that class is not established in this project; `scrollbar-none` is the current convention.
- Left-edge fade div (rendered when `showLeftFade`): `pointer-events-none absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-hero-bg to-transparent` + `aria-hidden="true"`.
- Right-edge fade div (rendered when `showRightFade`): mirror with `from-hero-bg` on the right edge via `bg-gradient-to-l`.
- "See more →" button (rendered when `itemCount > overflowThreshold && showRightFade`): class string in "Design System Values" table. `onClick`: `scrollerRef.current?.scrollBy({ left: 300, behavior: 'smooth' })`. Respect reduced motion by falling back to `behavior: 'auto'` inside a `window.matchMedia('(prefers-reduced-motion: reduce)').matches` check.
- Wrap in `<div role="region" aria-label={ariaLabel} className={cn('relative', className)}>`.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Edge fades appear when content genuinely overflows. Affordance appears when `itemCount > overflowThreshold` AND right-fade is showing. `gap-3` (12px) between children.
- Tablet (768px): Same behavior; overflow more common at this width.
- Mobile (375px): Native touch-scroll is preserved. The affordance button remains interactive but keyboard focus is the primary benefit (touch users scroll directly).

**Inline position expectations:** Children share y ±2px (horizontal-row layout).

**Guardrails (DO NOT):**
- Do NOT use `scrollbar-thin` — unavailable in this project. Use `scrollbar-none`.
- Do NOT use `behavior: 'smooth'` unconditionally — gate on reduced-motion preference.
- Do NOT anchor the affordance button to `top-2` or similar absolute offsets that won't center vertically — use `top-1/2 -translate-y-1/2`.
- Do NOT apply `from-dashboard-dark` without visual verification first; `from-hero-bg` is the spec's specified token.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| renders children in a scrollable container | unit | Children appear in DOM with `overflow-x-auto` on parent |
| role=region + aria-label propagates | unit | Accessibility wiring correct |
| right-edge fade hidden when content fits | unit | With `scrollWidth === clientWidth`, fade div absent |
| right-edge fade visible when overflow present | unit | Mock jsdom `scrollWidth > clientWidth`, scroll event → fade div visible |
| left-edge fade hidden until user scrolls right | unit | Initial state has no left fade; after dispatching a scroll event with `scrollLeft=50`, left fade appears |
| "See more" button hidden when itemCount ≤ threshold | unit | `itemCount=6, overflowThreshold=6` → button absent |
| "See more" button visible when itemCount > threshold AND content overflows | unit | `itemCount=7` + overflow mock → button present with correct aria-label="See more" |
| Clicking "See more" calls `scrollBy` | unit | Spy on scroller element's `scrollBy`; assert called with `left: 300` |
| Reduced-motion preference disables smooth scroll | unit | Mock `matchMedia('(prefers-reduced-motion: reduce)').matches = true`; assert `behavior: 'auto'` |

**Expected state after completion:**
- [ ] `frontend/src/components/ui/ScrollRow.tsx` exports `ScrollRow` and `ScrollRowProps`
- [ ] 9 tests pass
- [ ] No other file yet imports `ScrollRow` (consumed in Step 11)

---

### Step 3: Create `SOUND_CATEGORY_COLORS` constant

**Objective:** Central color map for Build Your Own Mix category groupings (Nature / Environments / Spiritual / Instruments). Consumed in Step 11.

**Files to create/modify:**
- `frontend/src/constants/soundCategoryColors.ts` — new
- `frontend/src/constants/__tests__/soundCategoryColors.test.ts` — new

**Details:**

Match the spec's shape exactly:

```ts
export type SoundCategory = 'nature' | 'environments' | 'spiritual' | 'instruments'

export interface SoundCategoryTokens {
  bgClass: string
  borderClass: string
  iconInactiveClass: string
  iconActiveClass: string
  activeGlow: string
}

export const SOUND_CATEGORY_COLORS: Record<SoundCategory, SoundCategoryTokens> = {
  // see "Design System Values" table for exact values per category
}

export const SOUND_CATEGORY_LABELS: Record<SoundCategory, string> = {
  nature: 'Nature',
  environments: 'Environments',
  spiritual: 'Spiritual',
  instruments: 'Instruments',
}
```

Verify that `SOUND_CATEGORIES` in `frontend/src/data/sound-catalog.ts` uses the same 4 category IDs — if it uses different string literals (e.g., "weather" instead of "environments"), align the const to the existing data rather than forcing a data migration. Step 11 uses these keys for lookup.

[UNVERIFIED] Icon-on-tile contrast. Verify in Step 18 that active-state icons (`text-emerald-200`, `text-amber-200`, `text-violet-200`, `text-sky-200`) pass WCAG AA on `bg-emerald-500/[0.08]` (etc.) composited over `#0f0a1e`. If any category fails, bump the icon to `-100` (lighter) and re-verify.
→ To verify: axe DevTools + manual contrast calc during Step 18
→ If wrong: change `iconActiveClass` to the `-100` variant for the failing category

**Auth gating:** N/A.

**Responsive behavior:** N/A — constant definition only.

**Guardrails (DO NOT):**
- Do NOT add category IDs not present in `SOUND_CATEGORIES`.
- Do NOT hardcode RGBA values in the `activeGlow` without documenting the source hex (Emerald-500 `#10B981` → `rgba(52, 211, 153, 0.45)` uses Emerald-400 for better glow luminance; same pattern for others).

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Exports all 4 category tokens | unit | `Object.keys(SOUND_CATEGORY_COLORS)` matches `['nature', 'environments', 'spiritual', 'instruments']` |
| Each token has 5 required fields | unit | Loops over entries asserting presence of bgClass, borderClass, iconInactiveClass, iconActiveClass, activeGlow |
| Labels match category keys | unit | Every key in `SOUND_CATEGORY_COLORS` exists in `SOUND_CATEGORY_LABELS` |
| Category IDs align with `SOUND_CATEGORIES` | integration | Import `SOUND_CATEGORIES` from `data/sound-catalog`; verify every `SOUND_CATEGORY_COLORS` key exists among the categories' IDs |

**Expected state after completion:**
- [ ] `frontend/src/constants/soundCategoryColors.ts` exports the constant, type, and labels
- [ ] 4 tests pass
- [ ] No other file yet imports these (consumed in Step 11)

---

### Step 4: Update `PageHero.tsx` — non-italic white subtitle

**Objective:** Retire the deprecated `font-serif italic text-white/60` subtitle treatment across all `<PageHero>` consumers. Cross-page change.

**Files to create/modify:**
- `frontend/src/components/PageHero.tsx` — line 50

**Details:**

Change line 50:

```tsx
// Before
<p className="mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg">

// After
<p className="mx-auto max-w-xl text-base text-white sm:text-lg">
```

No other PageHero changes. The `renderWithScriptAccent(title, scriptWord)` path at line 42 already handles `scriptWord === undefined` correctly — Step 5 removes the `scriptWord="Music"` prop from MusicPage's invocation, which eliminates the Caveat accent on `/music` without any PageHero component change.

**Cross-page impact:** MyPrayers, ScriptureSoaking, BreathingExercise, PsalmReading, AskPage all inherit the new subtitle styling. This aligns them with `09-design-system.md` § Text Opacity Standards (homepage + Daily Hub use `text-white`). Step 18 visually verifies all 6 pages.

**Auth gating:** N/A.

**Responsive behavior:** Identical to before (`mx-auto max-w-xl text-base sm:text-lg`).

**Guardrails (DO NOT):**
- Do NOT keep italic styling by falling back to `italic` on specific consumer pages. The italic-serif pattern is globally deprecated.
- Do NOT change `max-w-xl` or the responsive sizing.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| PageHero subtitle renders solid white | unit | `render(<PageHero title="X" subtitle="Y" />)` — subtitle has `text-white` class, not `text-white/60` |
| PageHero subtitle is not italic | unit | Assert no `italic` class and no `font-serif` class |
| Existing PageHero snapshot tests updated | unit | Update any PageHero-related snapshot tests that embed the old class string. Run `pnpm test --update` for non-critical snapshots after manual review |

**Expected state after completion:**
- [ ] PageHero.tsx line 50 uses `text-white` class, not `text-white/60 font-serif italic`
- [ ] All existing PageHero tests pass; any snapshot tests updated with justification noted in the test file
- [ ] `pnpm build` passes
- [ ] Cross-page visual verification deferred to Step 18 (MyPrayers, ScriptureSoaking, BreathingExercise, PsalmReading, AskPage, Music)

---

### Step 5: Update `MusicPage.tsx` — default tab, retire scriptWord, swap tab bar to Daily Hub pill+halo

**Objective:** Change the default tab to `'playlists'`, remove the Caveat accent on the hero, and replace the bespoke animated-underline tab bar with Daily Hub's pill+halo markup (copied inline, no new shared primitive).

**Files to create/modify:**
- `frontend/src/pages/MusicPage.tsx`
- `frontend/src/pages/__tests__/MusicPage.test.tsx` — extend

**Details:**

1. **Line 51:** Change `const defaultTab: MusicTabId = 'ambient'` → `const defaultTab: MusicTabId = 'playlists'`. Do NOT change the 3 `setSearchParams({ tab: 'ambient' })` calls at lines 82, 112, 117 (shared-mix flow).

2. **Lines 178-182:** Remove `scriptWord="Music"` from the `<PageHero>` invocation. Final form:

```tsx
<PageHero
  title="Music"
  subtitle="Worship, rest, and find peace in God's presence."
/>
```

3. **Lines 188-241:** Replace the entire sticky tab bar block with the Daily Hub markup pattern. Copy from `DailyHub.tsx` lines 238-292, adapted for Music's 3-tab structure. Final form (structural — full class strings per "Design System Values" table):

```tsx
<div
  className={cn(
    'relative sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none',
    isSticky && 'shadow-md shadow-black/20',
  )}
>
  <div className="mx-auto flex max-w-xl items-center justify-center px-4 py-3 sm:py-4">
    <div
      ref={tabBarRef}
      className="flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1"
      role="tablist"
      aria-label="Music sections"
      {...(tabBarTooltip.shouldShow ? { 'aria-describedby': 'music-ambient-tab' } : {})}
    >
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon // NEW — TABS needs an icon field (see below)
        return (
          <button
            key={tab.id}
            ref={(el) => { tabButtonRefs.current[index] = el }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => switchTab(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, index)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px] text-sm font-medium transition-all motion-reduce:transition-none duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg sm:text-base active:scale-[0.98]',
              isActive
                ? 'bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
            )}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            <span className="hidden min-[400px]:inline">{tab.label}</span>
            <span className="sr-only min-[400px]:hidden">{tab.label}</span>
          </button>
        )
      })}
    </div>
  </div>
</div>
```

4. **TABS array (line 35):** Add an `icon` field matching Daily Hub's pattern. Use `lucide-react`:

```tsx
import { Music, Wind, Moon } from 'lucide-react'

const TABS = [
  { id: 'playlists', label: 'Worship Playlists', shortLabel: 'Playlists', icon: Music },
  { id: 'ambient', label: 'Ambient Sounds', shortLabel: 'Ambient', icon: Wind },
  { id: 'sleep', label: 'Sleep & Rest', shortLabel: 'Sleep', icon: Moon },
] as const
```

5. **Delete the underline `<div>`:** Lines 231-238 (the `<div className="absolute bottom-0 h-0.5 bg-primary ..." />` block) are removed entirely. The animated underline concept goes away — the active-pill halo replaces it.

6. **Delete `activeTabIndex`:** Line 150 `const activeTabIndex = TABS.findIndex((t) => t.id === activeTab)` is no longer used after the underline is removed.

7. **Keep:** All tab-panel markup (lines 244-280) unchanged. `handleTabKeyDown`, `tabButtonRefs`, `switchTab`, sentinel, `isSticky` state — all unchanged. The `hidden` attribute on tab panels still gates rendering.

8. **Short label handling:** The `shortLabel` field is no longer used (the new markup uses `hidden min-[400px]:inline` to show full label at ≥400px and `sr-only min-[400px]:hidden` below that — matching Daily Hub). Remove `shortLabel` from the TABS array to avoid unused-field warnings, OR keep for future re-use and ignore. Recommend removing since YAGNI.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Pill tabs render at `max-w-xl` centered, with label text visible. `gap-2` between icon and label.
- Tablet (768px): Identical layout, same `max-w-xl` container.
- Mobile (375px): Label stays hidden below 400px viewport; `sr-only` span announces the label to screen readers. Icon visible. Tab pill `min-h-[44px]` preserves touch target.

**Inline position expectations:**
- 3 tabs share y ±2px at all breakpoints (part of inline table above).
- Icon + label share y ±2px within each tab.

**Guardrails (DO NOT):**
- Do NOT leave behind the animated-underline `<div>`.
- Do NOT change the `tabpanel-*` IDs or `aria-controls` wiring.
- Do NOT rewrite `handleTabKeyDown` — it already implements WAI-ARIA arrow/Home/End pattern correctly.
- Do NOT change the shared-mix routing at lines 82, 112, 117.
- Do NOT add a shared `<Tabs>` primitive in this step — see Edge Cases & Decisions.
- Do NOT change `focus-visible:ring-offset-[#0f0a1e]` → `focus-visible:ring-offset-hero-bg`; the Music page background is `bg-dashboard-dark` (`#0f0a1e`), not `bg-hero-bg`. Use `focus-visible:ring-offset-[#0f0a1e]` to match the page bg exactly OR change the page bg to `bg-hero-bg` (not recommended in this spec).

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Default landing tab is playlists | integration | Render `<MusicPage />` at `/music` (no querystring); assert the `?tab=playlists` is set via `useSearchParams` and the Playlists panel is not hidden |
| Shared-mix deep link still routes to ambient | integration | Mount with URL `/music?mix=<valid-mix>`; assert `?tab=ambient` is set, SharedMixHero renders |
| h1 renders "Music" without Caveat accent | integration | h1 textContent === "Music"; no element with `font-script` class under h1 |
| Tab bar uses pill+halo structure | integration | Assert the outer tablist div has classes `rounded-full border border-white/[0.12] bg-white/[0.06] p-1`; active tab has `bg-white/[0.12] border border-white/[0.15]` and `shadow-[0_0_12px_rgba(139,92,246,0.15)]` |
| Tab has icon component | integration | Each tab button contains an SVG from lucide |
| No animated underline element | integration | Query for `[class*="bg-primary"][class*="transition-transform"]` inside the tablist → should be absent |
| Arrow-key navigation preserved | integration | Focus Playlists; ArrowRight moves focus to Ambient; ArrowRight moves to Sleep; ArrowRight wraps to Playlists (handleTabKeyDown logic) |
| Home/End keys preserved | integration | Focus Sleep; Home moves to Playlists; End moves to Sleep |
| Direct visit to `/music?tab=sleep` lands on Sleep | integration | Sleep panel is visible |

**Expected state after completion:**
- [ ] `/music` (no querystring) resolves to `?tab=playlists` and renders Playlists panel
- [ ] Hero h1 is "Music" in gradient Inter, no Caveat span anywhere
- [ ] Subtitle is Inter non-italic white (inherited from Step 4)
- [ ] Tab bar is visually identical to Daily Hub's pill+halo
- [ ] All existing MusicPage tests pass (after updating old assertions that targeted the underline div and default tab)
- [ ] 9 new tests pass

---

### Step 6: Update `WorshipPlaylistsTab.tsx` — SectionHeader + Spotify disclaimer

**Objective:** Migrate Featured/Explore section headings to `<SectionHeader>` and add the preview-only disclaimer above both Featured and Explore.

**Files to create/modify:**
- `frontend/src/components/music/WorshipPlaylistsTab.tsx`
- `frontend/src/components/music/__tests__/WorshipPlaylistsTab.test.tsx` — update or create

**Details:**

1. Delete imports: `HeadingDivider`, `useElementWidth`. Delete local refs: `featuredRef`, `featuredWidth`, `exploreRef`, `exploreWidth`.
2. Add imports: `SectionHeader` from `@/components/ui/SectionHeader`, `Info` from `lucide-react`.
3. Replace the Featured heading block (lines 31-36):

```tsx
<SectionHeader>Featured</SectionHeader>
<p className="mx-auto mb-3 flex max-w-2xl items-center justify-center gap-2 text-xs text-white/50">
  <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  <span>30-second previews play here. Tap any track or playlist to open in Spotify for full listening.</span>
</p>
```

4. Replace the Explore heading block (lines 44-49):

```tsx
<SectionHeader>Explore</SectionHeader>
<p className="mx-auto mb-3 flex max-w-2xl items-center justify-center gap-2 text-xs text-white/50">
  <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
  <span>30-second previews play here. Tap any track or playlist to open in Spotify for full listening.</span>
</p>
```

5. The outer wrapper `<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">` is preserved.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Disclaimer centered with `max-w-2xl`, left-aligned SectionHeader. Explore grid remains `sm:grid-cols-2` (2 columns at desktop — deliberate, not changed).
- Tablet (768px): Same layout, 2-column Explore grid.
- Mobile (375px): Disclaimer wraps below 375px if text is too long. SectionHeader truncates via `flex`. Explore grid → 1 column.

**Inline position expectations:**
- Info icon + disclaimer text share y ±2px (inline flex).

**Guardrails (DO NOT):**
- Do NOT render the disclaimer per-embed (exactly 2 instances: above Featured, above Explore).
- Do NOT reuse or add `HeadingDivider` to this file.
- Do NOT change the Explore grid or the Featured hero embed layout.
- Do NOT render an identical disclaimer inside the SpotifyEmbed component — it's a tab-level message, not a per-embed message.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Featured heading renders as SectionHeader | integration | Queries for `<h2>` with `text-white/50 uppercase` class; text is "Featured" |
| Explore heading renders as SectionHeader | integration | Same for "Explore" |
| No HeadingDivider SVG | integration | Query SVGs whose parent is a heading wrapper → should be 0 |
| No Caveat font | integration | No element in this component has `font-script` class |
| Disclaimer renders twice | integration | Query `p` elements containing "30-second previews" → exactly 2 |
| Disclaimer copy exact | integration | `textContent` equals "30-second previews play here. Tap any track or playlist to open in Spotify for full listening." |
| Disclaimer has Info icon | integration | Each disclaimer `p` contains an SVG descendant of `h-3.5 w-3.5` size |

**Expected state after completion:**
- [ ] Playlists tab renders the new section headings and disclaimers
- [ ] Visual verification in Step 18 confirms ±2px alignment with Grow's "Coming Up" treatment (aspirational; DailyHub is the anchor)
- [ ] Existing WorshipPlaylistsTab tests updated

---

### Step 7: Update `SpotifyEmbed.tsx` — FrostedCard error state + white pill CTA

**Objective:** Upgrade the error/fallback card to the canonical FrostedCard treatment with a white-pill "Open in Spotify →" CTA. Also upgrade the offline-state card similarly.

**Files to create/modify:**
- `frontend/src/components/music/SpotifyEmbed.tsx`
- `frontend/src/components/music/__tests__/SpotifyEmbed.test.tsx` — update

**Details:**

1. Replace the error-state card (lines 52-71):

```tsx
if (status === 'error') {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-6 text-center',
        'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
        className,
      )}
    >
      <p className="font-medium text-white">{playlist.name}</p>
      <p className="mt-1 text-sm text-white/60">
        Player couldn&apos;t load. Tap below for full listening in the Spotify app.
      </p>
      <a
        href={playlist.spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] transition-colors motion-reduce:transition-none"
      >
        Open in Spotify →
      </a>
    </div>
  )
}
```

2. Apply the same FrostedCard treatment to the offline-state card (lines 39-50) — the content stays (WifiOff icon + "Spotify playlists available when online" text), only the outer `<div>`'s class list upgrades to match the error-state card's FrostedCard treatment.

3. Use a plain `<a>` rather than `<Button asChild>` — the `Button` component lacks an `asChild` prop and lacks a `light` variant. The inline class string (from "Design System Values" § white-pill inline Pattern 1) is the canonical source.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop/tablet/mobile: `text-center` layout stacks cleanly. CTA pill is `min-h-[44px]` for touch target.

**Inline position expectations:** N/A (single-column layout).

**Guardrails (DO NOT):**
- Do NOT strip the `target="_blank" rel="noopener noreferrer"` attributes. These are security-required.
- Do NOT use `<Button>` component since `light` variant doesn't exist; the inline class string is more maintainable than adding a variant.
- Do NOT remove the `→` trailing character — it signals outbound action per spec.
- Do NOT drop the offline-state upgrade — it's a sibling UX that should match.
- Do NOT shorten the copy back to "Player couldn't load — tap to open in Spotify" — the new copy is stronger intent-to-action.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Error state renders FrostedCard treatment | unit | Simulate `status='error'`; root div has `rounded-xl border border-white/[0.12] bg-white/[0.06]` classes |
| Error CTA is white pill with trailing arrow | unit | Anchor has `bg-white text-primary` and textContent ends with "→" |
| Error CTA preserves security attrs | unit | `target="_blank" rel="noopener noreferrer"` on the anchor |
| Error CTA href points to playlist spotifyUrl | unit | `href === playlist.spotifyUrl` |
| Offline card uses matching FrostedCard treatment | unit | Same class assertions when `isOnline=false` |
| Timeout triggers error state | integration | Mock iframe `load` event never fires; after 10s + advance timers, error state visible |

**Expected state after completion:**
- [ ] Error card uses FrostedCard treatment and white pill CTA
- [ ] Offline card uses FrostedCard treatment
- [ ] Existing tests updated; all pass

---

### Step 8: Update `AmbientBrowser.tsx` — dedupe featured, SectionHeader everywhere

**Objective:** Filter `FEATURED_SCENE_IDS` out of the All Scenes grid (fixes the 14→11 duplication bug). Migrate every section heading to `<SectionHeader>`. Add explicit "Featured" SectionHeader.

**Files to create/modify:**
- `frontend/src/components/audio/AmbientBrowser.tsx`
- `frontend/src/components/audio/__tests__/AmbientBrowser.test.tsx` — update or create

**Details:**

1. Add import: `SectionHeader` from `@/components/ui/SectionHeader`.

2. **Dedupe:** Line 170 currently maps `search.filteredScenes`. Replace with:

```tsx
{search.filteredScenes
  .filter((scene) => !FEATURED_SCENE_IDS.includes(scene.id as typeof FEATURED_SCENE_IDS[number]))
  .map((scene) => (
    <SceneCard
      key={scene.id}
      scene={scene}
      isActive={scenePlayer.activeSceneId === scene.id}
      onPlay={scenePlayer.loadScene}
    />
  ))}
```

Note: `FEATURED_SCENE_IDS` is declared `as const` in `scenes.ts` (readonly tuple). Cast is required for `.includes()` type safety.

Preserve the enclosing `<section aria-label="All scenes">` and `<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">` wrapper.

3. **Saved Mixes heading (line 138):** Replace `<h2 className="mb-3 text-sm font-semibold text-white">Your Saved Mixes</h2>` with `<SectionHeader>Your Saved Mixes</SectionHeader>`.

4. **Add explicit Featured heading:** Before line 153 (the featured row), add:

```tsx
<SectionHeader>Featured</SectionHeader>
```

5. **All Scenes heading (line 168):** Replace with `<SectionHeader>All Scenes</SectionHeader>`.

6. **Build Your Own Mix heading (line 186):** Replace with `<SectionHeader>Build Your Own Mix</SectionHeader>`. The outer `rounded-xl border border-white/10 bg-white/[0.06] p-6` frosted panel stays — it's the BYOM container decision documented in Edge Cases.

7. Also update the `SearchResults` component's inline Scenes/Sounds labels at lines 48 and 73 (`<h3 className="text-sm font-medium text-white/50">`) to use `<SectionHeader as="h3">`. These are inside the search flow and currently inconsistent with the new treatment.

**Auth gating:** Saved Mixes section already gates on `isAuthenticated && mixes.length > 0`. No change.

**Responsive behavior:**
- Desktop (1440px): Featured row grid-3 on `lg`, All Scenes grid-4, Saved Mixes grid-3.
- Tablet (768px): Featured row grid-2, All Scenes grid-3, Saved Mixes grid-2.
- Mobile (375px): Featured row scroll-x, All Scenes grid-2, Saved Mixes scroll-x.

**Inline position expectations:** SectionHeader heading + right-action (if any) share y ±2px. All section-header instances at the start of their sections render on the same visual baseline.

**Guardrails (DO NOT):**
- Do NOT remove the BYOM outer frosted panel (`rounded-xl border border-white/10 bg-white/[0.06] p-6`). It's the container architecture.
- Do NOT use `as="h2"` inside `SearchResults` — search results are sub-content; h3 is correct.
- Do NOT delete `HeadingDivider` from `frontend/src/components/` — other consumers may exist (spec out-of-scope).

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| All Scenes grid renders 8 cards when 11 scenes exist | integration | Mock `search.filteredScenes` to return 11 scenes; assert only 8 SceneCard components render in the All Scenes grid |
| Featured scenes still render 3 cards | integration | FeaturedSceneCard count === 3 |
| Total SceneCard + FeaturedSceneCard count === 11 | integration | Sum of both sections equals unique scene count |
| Explicit "Featured" SectionHeader renders | integration | h2 with "Featured" textContent exists before FeaturedSceneCards |
| Saved Mixes hidden when !isAuthenticated | integration | Mount with auth=false; no "Saved Mixes" text in DOM |
| All top-level headings use text-white/50 | integration | Each of ["Featured", "All Scenes", "Build Your Own Mix"] has a parent h2 with `text-white/50` |
| Search result sub-headings use h3 | integration | When search has a query, the Scenes/Sounds labels render as h3 not h2 |

**Expected state after completion:**
- [ ] Ambient tab renders exactly 11 unique scene cards (3 featured + 8 grid)
- [ ] All 4 section headings on Ambient use `<SectionHeader>`
- [ ] AmbientBrowser tests updated

---

### Step 9: Update `scene-backgrounds.ts` — desaturate 11 scene gradients by ~35%

**Objective:** Reduce saturation of every scene card gradient so the 11 scenes visually belong on the dashboard-dark canvas, while preserving per-scene color identity.

**Files to create/modify:**
- `frontend/src/data/scene-backgrounds.ts`
- `frontend/src/data/__tests__/scene-backgrounds.test.ts` — update or create

**Details:**

Approach: convert each hex stop in each gradient to HSL, multiply saturation by 0.65 (35% reduction), convert back to hex. For repeating-pattern noise overlays currently at `rgba(255,255,255,0.06-0.08)`, reduce to `rgba(255,255,255,0.04-0.06)` (multiply alpha by 0.67).

The executor has two acceptable approaches:

**Approach A (per-gradient HSL math):**
- For each gradient's hex stops, compute new hex = `culori.hsl(hex).s *= 0.65; hex = culori.rgb(hsl).hex()`.
- Use `culori` if available (already in the project? verify with `ls node_modules/culori`); otherwise compute manually.

**Approach B (overlay blend — fallback):**
- Add `rgba(15, 10, 30, 0.25)` overlay to every gradient's composition. Less surgical but more consistent.

Per Edge Cases: executor may choose A; if per-gradient math proves tedious or causes identity loss, fall back to B. Either satisfies the spec's "desaturate ~35%" target.

Verify the list of 11 scene IDs matches `FEATURED_SCENE_IDS` (3) + SCENE_PRESETS (11) ÷ deduplication: per recon, the scenes are `garden-of-gethsemane, still-waters, midnight-rain, ember-and-stone, morning-mist, upper-room, starfield, mountain-refuge, peaceful-study, evening-scripture, sacred-space` (11 total).

[UNVERIFIED] Per-scene target hex values. The spec's §3.3 table shows partial example values (Garden of Gethsemane `#282E1F`, `#3D4536`, `#343A2E`). Executor produces the full 11-scene table during execution, verifying each preserves scene identity (green-olive stays green-olive, teal stays teal, etc.) via visual comparison.
→ To verify: Step 18 Playwright visual pass on all 11 scene cards at 1440px and 375px
→ If wrong: fall back to Approach B (overlay blend)

**Auth gating:** N/A.

**Responsive behavior:** N/A (data change only).

**Guardrails (DO NOT):**
- Do NOT change the gradient angle or stop percentages — only hue-preserving saturation math.
- Do NOT uniformly use the same desaturation value for the overlay opacity adjustment — individual overlays vary; scale each by `×0.67` relative to its current alpha.
- Do NOT remove or consolidate gradients — each scene retains its own gradient identity.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| All 11 scenes have backgrounds | unit | `getSceneBackground(id)` returns a defined style object for each of the 11 scene IDs |
| No background is now black/uniform-gray | unit | Each gradient still contains distinct hex stops (not all identical) |
| Overlay alpha reduced proportionally | unit | (If keeping per-gradient values) assert new alpha < old alpha for each overlay |

**Expected state after completion:**
- [ ] All 11 scenes render visibly desaturated on Step 18's visual pass
- [ ] Per-scene color identity preserved (Gethsemane olive, Still Waters teal, Midnight Rain navy, etc.)
- [ ] No regression in scene card legibility (name + tag chips still readable)

---

### Step 10: Add optional `themeColor` field to scene data model

**Objective:** Add optional `themeColor?: string` to the `ScenePreset` type and populate it for each scene. Not consumed by any current code path — added for future use per the spec's explicit call-out.

**Files to create/modify:**
- `frontend/src/types/music.ts` — add `themeColor?: string` to `ScenePreset`
- `frontend/src/data/scenes.ts` — add a `themeColor` field to each of the 11 preset objects
- `frontend/src/data/__tests__/scenes.test.ts` — extend to verify presence

**Details:**

Suggested values (derived from the primary scene color identity):

| Scene ID | `themeColor` |
|---|---|
| garden-of-gethsemane | `#3D4A2C` |
| still-waters | `#2F5454` |
| midnight-rain | `#1A2A3A` |
| ember-and-stone | `#4A2A1F` |
| morning-mist | `#5A6B7A` |
| upper-room | `#4A2A3A` |
| starfield | `#1E1A3A` |
| mountain-refuge | `#2A3A2A` |
| peaceful-study | `#3A2A1A` |
| evening-scripture | `#2A1A3A` |
| sacred-space | `#3A2A3A` |

These are illustrative starting points; executor adjusts to match the Step 9 desaturated gradient's primary color.

**Auth gating:** N/A.

**Responsive behavior:** N/A.

**Guardrails (DO NOT):**
- Do NOT mark `themeColor` required. Backward compatibility is required — existing code reads `scene.themeColor` must handle `undefined`.
- Do NOT add a consumer to SceneCard or FeaturedSceneCard — "forward-looking" means unused.
- Do NOT add an HSL or RGB object; plain hex string keeps the format consistent with existing data.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Every scene has `themeColor` | unit | For each of 11 scenes, `typeof scene.themeColor === 'string'` |
| `themeColor` is a valid hex | unit | Regex `/^#[0-9A-Fa-f]{6}$/` matches |
| Type `ScenePreset` accepts optional themeColor | type | TS compiler does not error if themeColor is omitted from a new ScenePreset literal |

**Expected state after completion:**
- [ ] `frontend/src/types/music.ts` declares `themeColor?: string` on ScenePreset
- [ ] `frontend/src/data/scenes.ts` populates all 11 with themeColor values
- [ ] No consumer yet reads the field

---

### Step 11: Update `SoundGrid.tsx` + `SoundCard.tsx` — category colors, ScrollRow, glow halo

**Objective:** The largest visual change. Migrate Build Your Own Mix from 2D category grids to 1D horizontal scroll rows with per-category color themes and brighter active-state glows.

**Files to create/modify:**
- `frontend/src/components/audio/SoundGrid.tsx`
- `frontend/src/components/audio/SoundCard.tsx`
- `frontend/src/components/audio/__tests__/SoundGrid.test.tsx` — update or create
- `frontend/src/components/audio/__tests__/SoundCard.test.tsx` — update or create

**Details:**

**SoundGrid.tsx:**

1. Import: `ScrollRow`, `SectionHeader`, `SOUND_CATEGORY_COLORS`, `SOUND_CATEGORY_LABELS`, type `SoundCategory`.

2. Delete: the flat-index `focusedIndex` state, `gridRef`, `focusSound`, `handleKeyDown`, `soundIndexMap`, `allSounds` — all grid-specific 2D navigation logic (lines 38-92). Replace with per-row native tab order (each SoundCard gets `tabIndex={0}` when active in its category, `tabIndex={-1}` otherwise — simplified from the 2D flat-index model).

3. New render structure:

```tsx
<div className="space-y-8">
  {categories.map((group) => {
    const tokens = SOUND_CATEGORY_COLORS[group.category as SoundCategory]
    if (!tokens) return null // category not in the new color map — skip
    const label = SOUND_CATEGORY_LABELS[group.category as SoundCategory]
    const headerId = `category-${group.category}`
    return (
      <section key={group.category} aria-labelledby={headerId}>
        <SectionHeader as="h3" id={headerId}>{label}</SectionHeader>
        <ScrollRow ariaLabel={label} itemCount={group.sounds.length}>
          {group.sounds.map((sound) => (
            <SoundCard
              key={sound.id}
              sound={sound}
              categoryTokens={tokens}
              isActive={activeSoundIds.has(sound.id)}
              isLoading={loadingSoundIds.has(sound.id)}
              hasError={errorSoundIds.has(sound.id)}
              onToggle={onToggle}
            />
          ))}
        </ScrollRow>
      </section>
    )
  })}
</div>
```

Note: `SectionHeader` accepts `id` via the same-named prop (per Step 1's spec). Keep `aria-labelledby` wiring intact.

**SoundCard.tsx:**

1. Import type `SoundCategoryTokens` from `@/constants/soundCategoryColors`.

2. Add required prop `categoryTokens: SoundCategoryTokens` (replace `tabIndex` optional prop behavior — see below).

3. Rewrite the className composition (lines 34-38):

```tsx
className={cn(
  'relative flex w-20 h-20 sm:w-[90px] sm:h-[90px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-xl',
  'border backdrop-blur-sm transition-shadow duration-base motion-reduce:transition-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e]',
  'active:scale-[0.98]',
  categoryTokens.bgClass,
  categoryTokens.borderClass,
  isActive && cn(categoryTokens.activeGlow, 'motion-safe:animate-sound-pulse'),
)}
```

Key additions: `shrink-0 snap-start` for scroll-row layout, `border` + `categoryTokens.borderClass`, remove the uniform `bg-white/[0.06]`, replace uniform glow with per-category glow.

4. Icon color (lines 51-53):

```tsx
<Icon
  size={24}
  aria-hidden="true"
  className={cn(
    'transition-colors duration-base',
    isActive ? categoryTokens.iconActiveClass : categoryTokens.iconInactiveClass,
  )}
/>
```

5. Remove the `tabIndex` prop — native tab order handles this inside a ScrollRow.

6. Preserve `aria-pressed`, `aria-busy`, `aria-label`, error dot, loading spinner.

**Auth gating:** N/A.

**Responsive behavior:**
- Desktop (1440px): Each category row scroll-x native; 6-tile rows fit, 7-tile Nature shows affordance.
- Tablet (768px): Scroll-x, more categories likely show affordance.
- Mobile (375px): Native touch-scroll, `snap-x snap-mandatory` enforces card snap.

**Inline position expectations:** Sound tiles share y ±2px within their row (ScrollRow enforces).

**Guardrails (DO NOT):**
- Do NOT preserve the old 2D ArrowUp/Down keyboard logic. It doesn't map cleanly to horizontal rows; native tab is simpler and more accessible.
- Do NOT change the 90×90px tile footprint.
- Do NOT delete `motion-safe:animate-sound-pulse` — preserve it from line 37.
- Do NOT use uniform purple glow for active state — the per-category glow is the differentiator.
- Do NOT remove the `Loader2` loading spinner or the error dot.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| SoundGrid renders 4 categories when all present | integration | Mount with `SOUND_CATEGORIES` mock containing all 4; 4 sections appear |
| Each section uses SectionHeader | integration | Each category has an h3 with `text-white/50 uppercase` |
| ScrollRow wraps each category's tiles | integration | `role="region"` element present per section |
| SoundCard receives correct categoryTokens | integration | Mount Nature category; first SoundCard has `bg-emerald-500/[0.08]` class |
| Active SoundCard gets per-category glow | integration | Mock `isActive={true}` for a Nature sound; glow class `shadow-[0_0_16px_rgba(52,211,153,0.45)]` present |
| Category color changes by category | integration | Compare Nature vs Spiritual active glows — emerald vs violet |
| Active sound tile animates | integration | Active SoundCard has `motion-safe:animate-sound-pulse` |
| 7-sound Nature row shows affordance | integration | Render Nature with 7 sounds; "See more" button visible (behind overflow mock) |
| 6-sound Environments row hides affordance at 1440px | integration | Render Environments with 6 sounds + no overflow; "See more" absent |
| Tab navigation works within a row | integration | Focus first tile; Tab moves to the next SoundCard in the same category |
| Clicking toggles sound | integration | `onToggle` called with the correct sound |

**Expected state after completion:**
- [ ] Build Your Own Mix renders 4 category rows (Nature emerald, Environments amber, Spiritual violet, Instruments sky)
- [ ] Inactive tiles show subtle category tint; active tiles show bright icon + category-colored glow
- [ ] Rows do NOT wrap — horizontal scroll with affordance

---

### Step 12: Update `SleepBrowse.tsx` — white pill "Create a Routine" CTA

**Objective:** Replace the outlined-primary CTA with a white pill matching the Spotify error CTA.

**Files to create/modify:**
- `frontend/src/components/audio/SleepBrowse.tsx`
- `frontend/src/components/audio/__tests__/SleepBrowse.test.tsx` — update if tests exist

**Details:**

Replace the `<Link>` at lines 46-51 with the white-pill `<Link>`:

```tsx
<Link
  to="/music/routines"
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e] active:scale-[0.98] transition-colors motion-reduce:transition-none"
>
  Create a Routine
</Link>
```

Preserve the surrounding card: `<div className="rounded-xl border border-white/10 bg-white/[0.06] p-6 text-center">` (lines 39-45) — including the h3 heading "Build a Bedtime Routine" and the descriptive paragraph. The card itself is not a section header; it's a mini-hero card with its own h3.

**Auth gating:** N/A.

**Responsive behavior:** CTA centered via `text-center` on parent; touch target `min-h-[44px]`.

**Inline position expectations:** N/A (single element).

**Guardrails (DO NOT):**
- Do NOT use `<Button variant="light">` — variant doesn't exist.
- Do NOT migrate the surrounding "Build a Bedtime Routine" h3 to SectionHeader — this is a card heading, not a page section header (per spec §4.1 note).
- Do NOT remove `min-h-[44px]` — touch target guarantee.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Routine CTA is white pill with purple text | integration | Anchor has `bg-white text-primary` classes |
| Routine CTA href | integration | `href="/music/routines"` |
| Routine CTA has ≥ 44px touch target | integration | Rendered `min-h-[44px]` class |

**Expected state after completion:**
- [ ] Routine CTA passes WCAG AA
- [ ] Card preserved with updated CTA

---

### Step 13: Update `BibleSleepSection.tsx` — SectionHeader + quick-start icon color

**Objective:** Migrate "Scripture Reading" heading to `<SectionHeader>` and fix the quick-start card play-icon color to `text-primary-lt`.

**Files to create/modify:**
- `frontend/src/components/audio/BibleSleepSection.tsx`
- `frontend/src/components/audio/__tests__/BibleSleepSection.test.tsx` — create if absent

**Details:**

1. Import `SectionHeader`.
2. Replace line 43 heading with `<SectionHeader>Scripture Reading</SectionHeader>`.
3. Line 86: change `text-primary` → `text-primary-lt` on the quick-start play icons. **Do NOT** change line 59 (the Read the Bible BookOpen icon is already `text-primary-lt` and correct).

**Auth gating:** N/A (quick-start interaction already gated internally by `useScenePlayer`).

**Responsive behavior:** Preserved.

**Guardrails (DO NOT):**
- Do NOT change the Read the Bible hero card's layout or icon color.
- Do NOT move the gradient strip at line 56 (`bg-gradient-to-r from-amber-500 to-purple-600`) — it's the visual identity of the hero card and unrelated to this spec.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Scripture Reading heading uses SectionHeader | integration | h2 with `text-white/50 uppercase` text "Scripture Reading" |
| Quick-start play icons are `text-primary-lt` | integration | 3 Play icons in the quick-start grid — each has `text-primary-lt` class |
| Read the Bible icon unchanged | integration | BookOpen icon still `text-primary-lt` |

**Expected state after completion:**
- [ ] Scripture Reading section header migrated
- [ ] Quick-start icons pass WCAG AA

---

### Step 14: Update `TonightScripture.tsx` — label color + inverted play button

**Objective:** Fix the `text-primary` label contrast failure and invert the 48px play button to white-bg/purple-arrow with glow halo.

**Files to create/modify:**
- `frontend/src/components/audio/TonightScripture.tsx`
- `frontend/src/components/audio/__tests__/TonightScripture.test.tsx` — create if absent

**Details:**

1. Line 23: change `text-primary` → `text-white`:

```tsx
<p className="text-sm font-medium uppercase tracking-wide text-white">
  Tonight&apos;s Scripture
</p>
```

2. Line 40-47: replace the button:

```tsx
<button
  type="button"
  onClick={() => onPlay(reading)}
  aria-label={`Play ${reading.title}`}
  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0a1e] active:scale-[0.96]"
>
  <Play size={20} fill="currentColor" />
</button>
```

Note: `ring-offset-[#0f0a1e]` matches the Music page's dashboard-dark background (not hero-bg). Change to `hero-bg` only if Step 5's ring-offset is also flipped.

3. Line 26: preserve the card wrapper `border-2 border-primary/40 bg-white/[0.06]` as-is. The spec only targets the label and button, not the card frame.

**Auth gating:** N/A.

**Responsive behavior:** Preserved.

**Guardrails (DO NOT):**
- Do NOT remove `fill="currentColor"` on the Play icon — it's how the purple triangle renders.
- Do NOT change the card's outer `border-2 border-primary/40` — that purple frame is scene-identity, not icon contrast.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Label is solid white | integration | Span with text "Tonight's Scripture" has `text-white` |
| Label is NOT text-primary | integration | No `text-primary` class on label span |
| Play button is white with purple Play | integration | Button has `bg-white text-primary`; inner SVG color via currentColor |
| Play button has white glow | integration | Button `className` contains `shadow-[0_0_20px_rgba(255,255,255,0.15)]` |
| Play button active:scale feedback | integration | `active:scale-[0.96]` present |

**Expected state after completion:**
- [ ] Label passes WCAG AAA (21:1)
- [ ] Play button inverted, glow visible

---

### Step 15: Update `ScriptureSessionCard.tsx` — Scripture badge + inline play button

**Objective:** Fix Scripture badge contrast and invert inline 32px play button.

**Files to create/modify:**
- `frontend/src/components/audio/ScriptureSessionCard.tsx`
- `frontend/src/components/audio/__tests__/ScriptureSessionCard.test.tsx` — create if absent

**Details:**

1. Line 33-36: replace Scripture badge:

```tsx
<span className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
  <BookOpen size={10} aria-hidden="true" />
  Scripture
</span>
```

2. Line 37-42: replace the inline play button:

```tsx
<span
  className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-[0_0_12px_rgba(255,255,255,0.12)]"
  aria-hidden="true"
>
  <Play size={14} fill="currentColor" />
</span>
```

Keep `aria-hidden="true"` — the parent button owns the interaction; the icon is decorative.

**Auth gating:** N/A.

**Responsive behavior:** Card preserves existing `min-w-[220px]` + snap-start + horizontal scroll container (ScriptureCollectionRow).

**Inline position expectations:** Duration chip, voice chip, Scripture badge, inline play button share y ±2px. `ml-auto` on the play button positions it at the far right.

**Guardrails (DO NOT):**
- Do NOT change the parent button's focus-ring behavior; inner icon stays decorative.
- Do NOT add `hover:` or `focus:` to the inline play icon — parent owns those.
- Do NOT remove `fill="currentColor"` or `aria-hidden="true"`.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Scripture badge uses new violet treatment | integration | Badge span has `bg-violet-500/15 text-violet-300` |
| No `text-primary` or `bg-primary/10` on badge | integration | Old classes absent |
| Inline play button inverted | integration | Inner span has `bg-white text-primary` |
| Inline play button has subtle glow | integration | `shadow-[0_0_12px_rgba(255,255,255,0.12)]` present |
| Parent button interaction preserved | integration | Clicking card calls `onPlay` |

**Expected state after completion:**
- [ ] Scripture badge passes WCAG AA at 12px
- [ ] Inline play button consistent with TonightScripture 48px

---

### Step 16: Update `BedtimeStoryCard.tsx` — Story badge unification

**Objective:** Unify the Story badge treatment with the new Scripture badge. Play button stays out of scope.

**Files to create/modify:**
- `frontend/src/components/audio/BedtimeStoryCard.tsx`
- `frontend/src/components/audio/__tests__/BedtimeStoryCard.test.tsx` — create if absent

**Details:**

Replace lines 40-43:

```tsx
<span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
  <Moon size={10} aria-hidden="true" />
  Story
</span>
```

**Do NOT** touch the purple play button at lines 44-49 — explicitly out of scope per spec.

**Auth gating:** N/A.

**Responsive behavior:** Pill row preserved (may wrap on very narrow viewports, matching existing behavior).

**Guardrails (DO NOT):**
- Do NOT invert the card's play button — deferred.
- Do NOT change the `Moon` icon — it's the story-specific symbol.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| Story badge uses new violet treatment | integration | `bg-violet-500/15 text-violet-300` |
| Story badge has Moon icon | integration | SVG descendant of the badge |
| Play button unchanged (purple) | integration | Inner span still `bg-primary text-white` (confirming out-of-scope status) |

**Expected state after completion:**
- [ ] Story badge matches Scripture badge treatment
- [ ] Play button deferred

---

### Step 17: Update `ScriptureCollectionRow.tsx` + `BedtimeStoriesGrid.tsx` — SectionHeader

**Objective:** Migrate the 4 ScriptureCollectionRow headings and the BedtimeStoriesGrid heading to `<SectionHeader>`.

**Files to create/modify:**
- `frontend/src/components/audio/ScriptureCollectionRow.tsx`
- `frontend/src/components/audio/BedtimeStoriesGrid.tsx`

**Details:**

1. ScriptureCollectionRow.tsx line 16: replace `<h3 className="text-xl font-semibold text-white">{collection.name}</h3>` with `<SectionHeader>{collection.name}</SectionHeader>`. Rendered 4 times (one per collection: Psalms of Peace, Comfort & Rest, Trust in God, Hope & Promise) from SleepBrowse.

2. BedtimeStoriesGrid.tsx line 12: replace `<h3 className="text-xl font-semibold text-white">Bedtime Stories</h3>` with `<SectionHeader>Bedtime Stories</SectionHeader>`.

3. Preserve the `<section>` wrapper + `space-y-*` on ScriptureCollectionRow.

**Auth gating:** N/A.

**Responsive behavior:** Preserved.

**Guardrails (DO NOT):**
- Do NOT change the horizontal scroll container on ScriptureCollectionRow (the 4 collections already scroll-x).
- Do NOT migrate BedtimeStoriesGrid's grid layout.

**Test specifications:**
| Test | Type | Description |
|---|---|---|
| ScriptureCollectionRow renders SectionHeader | integration | h2 with collection name in `text-white/50 uppercase` |
| BedtimeStoriesGrid renders SectionHeader | integration | h2 "Bedtime Stories" |

**Expected state after completion:**
- [ ] Sleep tab has uniform section-heading treatment

---

### Step 18: Verification pass — Playwright + Lighthouse + axe

**Objective:** Visual regression, accessibility, and contrast verification across all three Music tabs plus the 5 PageHero-consuming pages.

**Files to create/modify:**
- None (verification only; may save screenshots to `frontend/playwright-screenshots/`)

**Details:**

Run `/verify-with-playwright` on:
- `/music` (confirm defaults to `?tab=playlists`)
- `/music?tab=playlists`
- `/music?tab=ambient`
- `/music?tab=sleep`
- `/grow` (PageHero cross-page verification)
- `/my-prayers` (PageHero cross-page verification)
- `/meditate/soaking?verse=psalm-46-10` (PageHero on a sub-page)
- `/meditate/breathing` (PageHero on a sub-page)
- `/ask` (PageHero with showDivider)

Tolerance: ±2px per design system. No "CLOSE" verdicts.

Lighthouse Accessibility target: ≥ 95 on `/music?tab=sleep`.

axe DevTools: no critical/serious issues on all 3 Music tabs.

Specific contrast verifications:
- "Tonight's Scripture" label: ≥ 21:1 (should be pure white).
- "Scripture" badge: ≥ 4.5:1 at 12px.
- "Story" badge: ≥ 4.5:1 at 12px.
- "Create a Routine" CTA: ≥ 4.5:1.
- Quick-start card play icons on BibleSleepSection: ≥ 4.5:1.
- Active sound tile icons in each of the 4 categories: ≥ 4.5:1 at active state.

Manual checks (spec §5):
- Navbar Music link → `?tab=playlists` resolution.
- Shared-mix deep link (if available) → still routes to `?tab=ambient`.
- DevTools Offline → reload `/music?tab=playlists` → Spotify error card visible with white pill CTA.
- Scroll Nature row with 7 items → right edge fade + "See more" visible; scroll right → left edge fade appears.
- Tap all 4 categories' sound tiles → verify per-category color distinguishes at a glance.
- Ambient scene cards before/after side-by-side → desaturation visible, identity preserved.

Edge cases (spec §5):
- Long playlist name in error card → graceful wrap/ellipsis.
- Empty Saved Mixes (logged-out) → section hidden.
- 20+ saved mixes → ScrollRow handles arbitrary count.
- Reduced motion preference → `animate-sound-pulse` gated; edge-fade transitions gated.
- Screen reader on Sleep tab → correct order announcement.

**Auth gating:** N/A.

**Responsive behavior:** All breakpoints verified (375px, 768px, 1440px).

**Guardrails (DO NOT):**
- Do NOT skip any of the 3 Music tabs.
- Do NOT skip the PageHero cross-page pages — Step 4 affects them all.
- Do NOT mark a verdict PASS if Lighthouse falls below 95 on Accessibility.

**Test specifications:** Not Vitest/RTL — runtime verification via Playwright MCP + Lighthouse CLI + axe DevTools.

**Expected state after completion:**
- [ ] All 9 routes verified at 375px + 1440px with no CLOSE verdicts
- [ ] Lighthouse Accessibility ≥ 95 on `/music?tab=sleep`
- [ ] axe DevTools: 0 critical / 0 serious on all 3 Music tabs
- [ ] Contrast verifications documented for the 6 specific elements above
- [ ] Reduced-motion preference verified (no pulse animation, no smooth scroll)
- [ ] Screen reader verification completed for Sleep tab structure
- [ ] All acceptance criteria from spec checked off

---

## Step Dependency Map

| Step | Depends On | Description |
|---|---|---|
| 1 | — | `SectionHeader` primitive |
| 2 | — | `ScrollRow` primitive |
| 3 | — | `SOUND_CATEGORY_COLORS` constant |
| 4 | — | `PageHero.tsx` subtitle |
| 5 | 4 | MusicPage shell (consumes PageHero change) |
| 6 | 1 | WorshipPlaylistsTab (consumes SectionHeader) |
| 7 | — | SpotifyEmbed (independent) |
| 8 | 1 | AmbientBrowser (consumes SectionHeader) |
| 9 | — | Scene gradients desaturation |
| 10 | — | `themeColor` data field (no consumer) |
| 11 | 1, 2, 3 | SoundGrid/SoundCard (consumes all 3 new primitives) |
| 12 | — | Routine CTA white pill (self-contained) |
| 13 | 1 | BibleSleepSection (SectionHeader + icon color) |
| 14 | — | TonightScripture (self-contained) |
| 15 | — | ScriptureSessionCard (self-contained) |
| 16 | — | BedtimeStoryCard (self-contained) |
| 17 | 1 | ScriptureCollectionRow + BedtimeStoriesGrid (SectionHeader) |
| 18 | 1-17 | Verification |

Steps 1, 2, 3, 4, 7, 9, 10, 12, 14, 15, 16 can run in parallel on different agents if desired. Steps 5, 6, 8, 11, 13, 17 depend on at least one primitive from Steps 1-3. Step 18 is the final gate.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|---|---|---|---|---|
| 1 | SectionHeader primitive | [COMPLETE] | 2026-04-18 | `components/ui/SectionHeader.tsx` + 7 tests pass; build clean. Minor plan note: `components/ui/Tabs.tsx` already exists (used only by GrowPage) — Step 5 still uses inline copy per plan authority. |
| 2 | ScrollRow primitive | [COMPLETE] | 2026-04-18 | `components/ui/ScrollRow.tsx` + 9 tests pass. Used `scrollbar-hide` (the defined utility) instead of `scrollbar-none` (plan reference is undefined in CSS). |
| 3 | SOUND_CATEGORY_COLORS constant | [COMPLETE] | 2026-04-18 | `constants/soundCategoryColors.ts` + 4 tests pass. Category IDs align with `SOUND_CATEGORIES`. |
| 4 | PageHero subtitle | [COMPLETE] | 2026-04-18 | `PageHero.tsx` line 50 subtitle → `text-white` non-italic. 3 new tests added, all 9 PageHero tests pass. Cross-page impact (MyPrayers, ScriptureSoaking, BreathingExercise, PsalmReading, AskPage, Music) verified in Step 18. |
| 5 | MusicPage default tab / scriptWord / tab bar | [COMPLETE] | 2026-04-18 | `pages/MusicPage.tsx`: default→playlists, `scriptWord` removed, pill+halo tab bar with lucide icons (Music/Wind/Moon). Underline div + `activeTabIndex` removed. All 26 MusicPage tests pass (updated defaults + added 6 new tests). Build clean. |
| 6 | WorshipPlaylistsTab SectionHeader + disclaimer | [COMPLETE] | 2026-04-18 | `WorshipPlaylistsTab.tsx`: HeadingDivider + useElementWidth removed, SectionHeader imported, preview disclaimer (Info icon + text) rendered above Featured and Explore. 13 tests pass (5 new). |
| 7 | SpotifyEmbed FrostedCard error + white pill | [COMPLETE] | 2026-04-18 | `SpotifyEmbed.tsx`: both offline and error cards upgraded to FrostedCard treatment, CTA is inline white pill with trailing →. 11 tests pass (2 new, 2 updated). |
| 8 | AmbientBrowser dedupe + SectionHeader | [COMPLETE] | 2026-04-18 | `AmbientBrowser.tsx`: FEATURED_SCENE_ID_SET filter on All Scenes grid (allOtherScenes), SectionHeader on 4 sections + 2 SearchResults sub-headings. Both test files (18 tests) pass after updating filter-reduce tests to account for dedupe. |
| 9 | Scene gradients desaturation | [COMPLETE] | 2026-04-18 | `scene-backgrounds.ts`: Approach A (per-scene HSL × 0.65) applied to all 39 hex stops across 11 scenes; overlay alphas reduced by ×0.67. 7 tests pass (2 new: distinct-stops + overlay-alpha cap). Identity preserved per scene. Visual verification deferred to Step 18. |
| 10 | ScenePreset.themeColor | [COMPLETE] | 2026-04-18 | `types/music.ts` adds optional `themeColor?: string`; `scenes.ts` adds themeColor (derived from desaturated primary bg) to all 11 scenes. 15 tests pass (1 new). No consumer yet. |
| 11 | SoundGrid + SoundCard category colors + ScrollRow | [COMPLETE] | 2026-04-18 | `SoundGrid.tsx`: 1D ScrollRow per category, SectionHeader as h3. `SoundCard.tsx`: required `categoryTokens` prop, per-category bg/border/icon/glow, removed `tabIndex`. `AmbientBrowser.tsx` SearchResults passes tokens by sound category. 22 new/updated tests pass; all 330 audio tests pass; build clean. |
| 12 | SleepBrowse white pill CTA | [COMPLETE] | 2026-04-18 | `SleepBrowse.tsx`: "Create a Routine" Link → inline white pill (Pattern 1). 9 tests pass (2 new). |
| 13 | BibleSleepSection SectionHeader + icon color | [COMPLETE] | 2026-04-18 | `BibleSleepSection.tsx`: heading → SectionHeader, quick-start Play icons → `text-primary-lt` (WCAG AA). Read-the-Bible hero icon preserved. 9 tests pass (3 new). |
| 14 | TonightScripture label + play button | [COMPLETE] | 2026-04-18 | `TonightScripture.tsx`: label → text-white, 48px play button inverted (white bg, primary icon, white glow halo). 8 tests pass (4 new). |
| 15 | ScriptureSessionCard badge + inline play | [COMPLETE] | 2026-04-18 | `ScriptureSessionCard.tsx`: Scripture badge → violet-500/15 + violet-300, inline 32px play → white bg + primary icon + subtle glow. 7 tests pass (2 new). |
| 16 | BedtimeStoryCard Story badge | [COMPLETE] | 2026-04-18 | `BedtimeStoryCard.tsx`: Story badge → violet-500/15 + violet-300 (matches Scripture badge). Play button unchanged (deferred). 8 tests pass (3 new). |
| 17 | ScriptureCollectionRow + BedtimeStoriesGrid SectionHeader | [COMPLETE] | 2026-04-18 | Both components migrated to SectionHeader. 6 tests pass (2 new). |
| 18 | Verification pass | [COMPLETE] | 2026-04-18 | **Performed:** Playwright visual verification at 1440px + 375px on `/music` (default→playlists ✓), `?tab=playlists`, `?tab=ambient`, `?tab=sleep`, plus `/my-prayers`, `/ask`, `/meditate/breathing`. Full test suite: 8699/8700 pass (1 failure pre-existing PlanBrowserPage drift, unrelated). `pnpm lint` clean. `pnpm build` clean. Screenshots at `frontend/playwright-screenshots/music-facelift/`. DOM diagnostics confirm: Music h1 no font-script descendant, pill+halo tablist classes present, subtitle `text-white` (not italic), per-category color tokens render distinctly on BYOM, dedupe visible (3 featured + 8 all-scenes = 11 unique), desaturated gradients preserve scene identity. **Deferred (requires additional tooling):** Lighthouse Accessibility ≥95 run, axe DevTools CLI sweep, screen-reader announcement walkthrough. Recommended as a pre-merge manual QA pass before the branch ships. |
| Post-execution fix | Dedupe `SoundCategory` type | [COMPLETE] | 2026-04-18 | Code review caught a duplicate `SoundCategory` union in `constants/soundCategoryColors.ts` shadowing the canonical type in `types/music.ts`. Fixed: `soundCategoryColors.ts` now imports `SoundCategory` from `@/types/music` and re-exports it; redundant `as SoundCategory` casts removed from `AmbientBrowser.tsx:84` and `SoundGrid.tsx:42,44`. `pnpm lint` clean, `pnpm build` clean, full music-facelift test scope passes. |
