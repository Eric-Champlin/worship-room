# Music Page Facelift — Round 2

**Master Plan Reference:** `_plans/music-page-facelift-round-2.md` — the source plan captures file-level changes, before/after snippets, and QA edge cases; this spec captures product intent and acceptance criteria for `/plan` and `/code-review`.

**Related spec:** `_specs/music-page-facelift.md` — Round 1 (already shipped on this branch). Round 2 is a polish pass addressing 12 user-surfaced issues found while reviewing the Round 1 result.

**Branch:** `claude/feature/music-page-facelift` (same branch as Round 1 — no new branch). All Round 2 commits stack on top of Round 1. Both rounds ship together as one PR.

---

## Overview

Round 1 landed the large restructuring pass on `/music` — shared tabs, section header primitive, scene desaturation, Sleep & Rest contrast fixes, Spotify preview expectations. Round 2 resolves the 12 issues the user surfaced after living with Round 1: the hero reads too small next to the enlarged section content, section headers need a two-tier hierarchy (gradient hero-adjacent vs uppercase groupings), the Spotify disclaimer copy overstates the preview restriction and is visually cluttered, Ambient scenes still pop too hard against the dark canvas, and Sleep & Rest cards suffer from a horizontal-scroll regression, uneven heights, an inconsistent pill row, and a missed play-button inversion on BedtimeStoryCard.

The aim is a tighter, quieter, more coherent Music page where the hero and section headers form a clean visual hierarchy, the Spotify expectation is stated honestly but unobtrusively, Ambient scenes feel like sanctuary atmosphere rather than illustrations, and every Sleep & Rest card is the same height with a single-line pill row regardless of content length.

## User Story

As a **logged-out visitor or logged-in user** returning to `/music` after Round 1 shipped, I want **a hero that reads with the weight the page deserves, section headings that telegraph which groupings are hero-adjacent vs quiet subsection labels, a Spotify disclaimer that tells me the truth without shouting, ambient scenes that feel like twilight backdrops rather than posters, and Sleep & Rest cards that align cleanly and fit their info on a single pill row**, so that **the page feels finished — the kind of polished, calm surface the rest of the app has — and I never have to scroll a row sideways to see my Psalms of Peace readings or squint at a duration pill rendered in 50%-opacity white**.

## Requirements

### Functional Requirements

#### Hero and section header hierarchy

1. The `<PageHero>` h1 is bumped up one size step at every breakpoint (mobile 30px → 36px, tablet 36px → 48px, desktop 48px → 60px). The bump applies to every page that uses `<PageHero>`, not just `/music`. Affected pages: `/music`, `/my-prayers`, `/ask`, `/meditate/breathing`, `/meditate/soaking`, `/meditate/psalms`. The page itself intentionally shares the upgrade.
2. The shared `<SectionHeader>` primitive gains a second variant. A `variant="default"` renders the existing left-aligned uppercase grouping treatment; a new `variant="gradient"` renders a centered, title-case, gradient-clipped headline sized one step below the new hero h1. Default is `'default'` when the prop is omitted, preserving every existing call site.
3. The default-variant color bumps from `text-white/50` to full `text-white`. Uppercase + tracking-wide treatment is preserved. Every existing default-variant consumer across `/music` (and elsewhere) gets the brighter color for free.
4. Gradient variant ignores the `icon` and `action` props if passed — the JSDoc documents this, and the variant renders the heading tag directly without a wrapper div.

#### Worship Playlists tab

5. The "Featured" and "Explore" section headings render with `variant="gradient"`, centered, title-case, gradient-clipped, visually smaller than the hero h1 (clear size hierarchy).
6. The Spotify preview disclaimer renders **once** on the tab — below the hero (Featured) embed only. It no longer appears above the Featured embed and no longer appears above or below the Explore grid.
7. The disclaimer copy reads exactly: `Previews play here unless you're logged into a Spotify Premium account.`
8. The disclaimer renders as a small grey centered paragraph — no `<Info>` icon, no wrapper card. Text is small (≈12px), subtle (`text-white/40`), horizontally centered, width capped to match the hero embed area.
9. The `PreviewDisclaimer` wrapper component and the `Info` icon import introduced in Round 1 are removed from `WorshipPlaylistsTab.tsx`.

#### Ambient Sounds tab

10. The "Build Your Own Mix" section heading renders with `variant="gradient"`, matching the hero-adjacent treatment used on Featured/Explore.
11. Every other `<SectionHeader>` on the Ambient tab ("Featured" for scenes, "All Scenes", "Saved Mixes", and the sub-grouping heads inside Build Your Own Mix: "Nature", "Environments", "Spiritual", "Instruments") stays on the default variant and inherits the new full-white color automatically.
12. Ambient scene card gradients are desaturated an additional ~30% on top of Round 1's 35% reduction — total reduction from the original illustrative colors approximately 55–60%. The `repeating-linear-gradient` overlay opacity is reduced proportionally.
13. Per-scene color identity must remain recognizable after the further desaturation (Gethsemane still reads green-ish, Still Waters still teal-ish, Midnight Rain still navy-ish). Text overlays on every card still meet WCAG AA.
14. Scenes that lose too much identity at the default multiplier may receive a per-scene override (documented inline as a code comment). No scene should render as a flat grey after the transformation.

#### Sleep & Rest tab

15. Scripture Collection rows (Psalms of Peace, Comfort & Rest, Trust in God, God's Promises) render as a responsive grid — **not** a horizontal scroll container. Grid columns: 1 at < 640px, 2 at 640–1024px, 3 at > 1024px. No horizontal scrollbar, no snap points, no right-edge fade. All cards in a row are visible without user scrolling.
16. Every Sleep & Rest card (`ScriptureSessionCard` and `BedtimeStoryCard`) renders at equal height within its row. Cards use an internal flex column layout that pushes the action row (pills + play button) to the bottom of the card via `mt-auto`, so a short-title card aligns its action row with a long-title card's action row.
17. The wrapper div around each card (the `relative` container holding the card button and the absolutely-positioned FavoriteButton) stretches to the parent grid cell's height so the inner button's `h-full` resolves correctly.
18. The `BedtimeStoryCard` play button is inverted from the Round 1 purple-on-white treatment to match `ScriptureSessionCard`: **white background, purple Play triangle, subtle white glow halo** (`shadow-[0_0_12px_rgba(255,255,255,0.12)]`). No other play buttons on the Sleep tab regress; the 14 play buttons outside the Sleep tab stay deferred.
19. The `BibleSleepSection` quick-start icons retain their Round 1 `text-primary-lt` (lighter purple) treatment — not inverted. This is an intentional carve-out.
20. Every Sleep & Rest card pill row renders with a **unified pill treatment**. All informational pills (duration, length on `BedtimeStoryCard`, voice) share the same shape, color, and typography (`bg-white/10 text-white/70 font-medium rounded-full px-2 py-0.5 text-xs whitespace-nowrap`). The category pill (Scripture on `ScriptureSessionCard`, Story on `BedtimeStoryCard`) keeps its violet-500/15 tint and violet-300 foreground for category identity.
21. Voice pill copy shortens from "Male voice" / "Female voice" to "Male" / "Female" to fit on a single line. The parent button's `aria-label` preserves the full "Male voice" / "Female voice" wording so screen readers retain semantic meaning.
22. `ScriptureSessionCard` pill row renders three pills + play button on a single line at every breakpoint from 375px upward.
23. `BedtimeStoryCard` pill row renders four pills + play button on a single line where width permits, with `flex-wrap` as a clean fallback for narrow cards. When wrapping occurs, all pills wrap together as a group — no orphan pill on its own line.
24. The `min-w-[220px]` and `shrink-0` layout hints on `ScriptureSessionCard` (left over from the horizontal-scroll layout) are removed so the card fills its grid cell.
25. The `snap-start` class on `ScriptureSessionCard` is removed (no snap container remains).

### Non-Functional Requirements

- **Accessibility:** Lighthouse Accessibility ≥ 95 on `/music?tab=sleep` (same target as Round 1). Voice pill at `text-white/70` on `bg-white/10` meets WCAG AA at 12px. Default-variant `<SectionHeader>` at full `text-white` hits 21:1 on `#0f0a1e` background (WCAG AAA). Category pill at `bg-violet-500/15` + `text-violet-300` already met AA in Round 1 — no regression. Aria-labels on pill buttons retain their pre-shortening semantic content.
- **Reduced-motion:** No new animations are introduced. The existing `animate-sound-pulse` gating established in Round 1 is preserved.
- **Performance:** No regression. The grid-wrap replacement for horizontal scroll is pure Tailwind class substitution — no new JS. `flex h-full flex-col` + `mt-auto` is pure layout CSS. The scene-gradient further desaturation is a static data change — no runtime cost.
- **Visual hierarchy:** Hero h1 > gradient-variant section headers > default-variant section headers, with clear size steps between each tier at every breakpoint.
- **Cross-page compatibility:** The `<PageHero>` size bump applies to all 6 consumers without breaking layout, awkward wrapping, or horizontal overflow at 375px or 1440px.

## Auth Gating

Round 2 is polish — it introduces no new interactive surfaces, no new auth-gated actions, and no new auth modals. Every interactive element already covered by Round 1's auth posture retains its current behavior.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| All `/music` actions changed by Round 2 | Unchanged from Round 1 — see `_specs/music-page-facelift.md` auth table | Unchanged from Round 1 | N/A — no new gates added |

**No new auth modals are added in this spec.**

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | Hero h1 renders at 36px (`text-4xl`). Gradient-variant section headers render at 30px (`text-3xl`) — visibly smaller than the hero. Scripture Collection rows render 1 column. All ScriptureSessionCard pills fit single-line on the full-width card; BedtimeStoryCard pills single-line or wrap as a clean group. Spotify disclaimer remains legible, centered below the hero embed. Scene cards keep Round 2's further-desaturated gradients. |
| Tablet (640–1024px) | Hero h1 at 48px (`text-5xl`). Gradient-variant section headers at 36px (`text-4xl`). Scripture Collection rows render 2 columns. All cards in a row maintain equal height. Pill rows single-line. |
| Desktop (> 1024px) | Hero h1 at 60px (`text-6xl`). Gradient-variant section headers at 48px (`text-5xl`). Scripture Collection rows render 3 columns. All cards in a row equal height. Pill rows single-line. Disclaimer below hero embed centered, width-capped to the embed's visual footprint. |

### Cross-breakpoint rules

- Every interactive element retains its ≥ 44px effective touch target (no changes to hitbox math).
- Pill rows prefer single-line; when width cannot accommodate, `flex-wrap` takes the whole group to the next line as a unit (BedtimeStoryCard only).
- Scripture Collection grid uses `items-stretch` (Tailwind default) so the card equal-height layout resolves without an explicit override.

## AI Safety Considerations

N/A — Round 2 does not introduce AI-generated content or free-text user input. The source plan modifies visual primitives, scene-gradient color values, section header treatments, and pill layouts. No new crisis detection is required. Spotify preview playback, scene playback, scripture audio playback, and bedtime story playback all remain pre-authored content surfaced through existing components. No user input field is introduced or modified.

## Auth & Persistence

- **Logged-out users:** Zero backend persistence. Nothing in Round 2 writes to a database for logged-out visitors. All Round 2 changes are visual/layout and static-data changes — no new client state, no new local persistence.
- **Logged-in users:** Identical to logged-out visitors with respect to Round 2's scope. No user data is written to a backend table as part of this spec.
- **localStorage usage:** **No new keys introduced.** Round 2 does not add entries to `11-local-storage-keys.md`. Existing `wr_*` keys established before or during Round 1 remain the canonical local persistence layer.

## Completion & Navigation

N/A — Music is not a Daily Hub tab and has no completion tracking. Round 2 introduces no new navigation routes, no new redirects, and no cross-tab context passing. Default-tab routing established in Round 1 is unchanged.

## Design Notes

- **References:**
  - `.claude/rules/09-design-system.md` for color palette, FrostedCard tier system, animation tokens, Round 3 visual patterns, and the `<SectionHeader>` primitive established in Round 1.
  - `_plans/recon/design-system.md` — the computed-style design system recon. `/plan` should pin exact gradient angles, pill background alpha, and pill text alpha values from this document.
  - `_plans/music-page-facelift-round-2.md` — the source plan with file-level before/after snippets and QA edge cases.
- **Existing components to reuse:**
  - `<PageHero>` — bump its h1 Tailwind size classes; props API is unchanged.
  - `<SectionHeader>` — extend with a `variant` prop; preserve the existing default behavior for every current call site that omits the prop.
  - `GRADIENT_TEXT_STYLE` — the canonical gradient-clipped text treatment already used by hero titles; the gradient variant of `<SectionHeader>` reuses this style.
  - `<ScriptureSessionCard>`, `<BedtimeStoryCard>`, `<ScriptureCollectionRow>`, `<FeaturedSceneCard>`, `<SceneCard>`, `<WorshipPlaylistsTab>`, `<AmbientBrowser>` — all modified in place; no new component files are created.
- **New primitives introduced by this spec:** None. Round 2 extends existing primitives with a variant prop rather than introducing a new component (avoids component proliferation). The gradient-variant behavior will be marked `[UNVERIFIED]` during planning until visually confirmed against the design system recon.
- **Visual aspects that must match existing patterns:**
  - Gradient variant `<SectionHeader>` uses the same gradient style object as `PageHero` (`GRADIENT_TEXT_STYLE`) — no new gradient constant.
  - Gradient variant size intentionally matches the pre-bump hero size (`text-3xl sm:text-4xl lg:text-5xl`) so that after the hero bumps up one step, the gradient section heads occupy the size tier the hero vacated. Clean hierarchy.
  - Unified pill treatment on Sleep & Rest cards matches the `bg-white/10` pill shape already used by the duration pill in Round 1; Round 2 extends the same treatment to the voice pill (previously plain text) and bumps the text alpha from `/50` to `/70` for readability.
  - Category pill (Scripture / Story) retains its Round 1 violet treatment unchanged — category identity is preserved.
  - Inverted play button on `BedtimeStoryCard` matches the existing inverted treatment on `ScriptureSessionCard` and `TonightScripture` — same background, same glow color, same icon color.
- **Patterns retired by Round 2:**
  - `<Info>` icon + wrapper card treatment for the Spotify preview disclaimer.
  - Second disclaimer above the Explore grid (single disclaimer is the new pattern).
  - Horizontal scroll layout for Scripture Collection rows (`flex snap-x snap-mandatory overflow-x-auto`). Grid wrap is the new pattern.
  - Plain-text voice label ("Male voice" / "Female voice") on Sleep & Rest cards. Unified pill treatment with shortened copy is the new pattern.
  - `text-white/50` as the default `<SectionHeader>` color.
  - `min-w-[220px]` + `shrink-0` + `snap-start` on `ScriptureSessionCard` (artifacts of the horizontal-scroll layout).
  - Purple-background (`bg-primary`) play button on `BedtimeStoryCard`.

## Out of Scope

- **Play button style inversion across the remaining 14 files** still deferred from Round 1 (AudioPlayerMini, AudioPlayerExpanded, AudioPlayButton, ScriptureSoaking, RoutineCard, ReadAloudButton, SharedMixHero, SavedMixCard, TimerTabContent, SceneCard, FeaturedSceneCard, AudioPill, DrawerNowPlaying, BibleSleepSection quick-start icons). Only `BedtimeStoryCard` is added to the inversion set in Round 2.
- **Spotify OAuth / Web Playback SDK integration for Premium users.** The new disclaimer acknowledges Premium unlocks full playback; building that integration is a separate future spec.
- **Changes to the tab bar, hero video, navbar, footer, or any non-Music page** beyond the cross-page effect of bumping `<PageHero>`'s h1 size.
- **Refactoring `AmbientBrowser`, `SleepBrowse`, `SoundGrid`, or other audio components** beyond the specific visual changes called out above.
- **A new dedicated gradient heading component.** Round 2 deliberately extends `<SectionHeader>` with a variant instead of introducing `<GradientHeader>` or similar — avoids component proliferation.
- **New localStorage keys.** None introduced.
- **Backend / API changes.** Phase 3+ work. None in this spec.
- **Full removal of the deprecated `<HeadingDivider>` component** that Round 1 retired from `/music`. Other consumers may still reference it; a separate cleanup spec will handle repo-wide removal.

## Acceptance Criteria

### Hero size bump (cross-page)

- [ ] `/music` h1 renders at 36px on mobile (375px), 48px on tablet (768px), and 60px on desktop (1440px).
- [ ] `/my-prayers`, `/ask`, `/meditate/breathing`, `/meditate/soaking`, and `/meditate/psalms` h1s all render at the same new sizes — verified via Playwright at 1440px and 375px.
- [ ] No horizontal overflow on any of the 6 `<PageHero>` consumer pages at 375px viewport.
- [ ] No awkward wrapping (single word on its own line, orphan letters) on any of the 6 pages at 1440px or 375px.

### SectionHeader variant prop

- [ ] `<SectionHeader>` exposes a `variant` prop with accepted values `'default'` and `'gradient'`. When the prop is omitted, `'default'` is used.
- [ ] `<SectionHeader variant="gradient">Featured</SectionHeader>` renders centered (`text-center`), title-case (no CSS case transform), gradient-clipped (inline style includes `backgroundImage` from `GRADIENT_TEXT_STYLE`), sized `text-3xl sm:text-4xl lg:text-5xl`.
- [ ] `<SectionHeader>` (no prop) and `<SectionHeader variant="default">` render identically — left-aligned uppercase tracking-wide, with the existing icon/action slots behaving as before.
- [ ] Default-variant color is full `text-white` (not `text-white/50`). Verified via computed style on a representative default-variant header on `/music`.
- [ ] The `icon` and `action` props are silently ignored when `variant="gradient"` is used. JSDoc documents this behavior.
- [ ] `SectionHeader.test.tsx` covers both variants, including: (a) gradient variant renders centered, (b) gradient variant renders with inline gradient style, (c) default variant renders `text-white` (not `text-white/50`).

### Worship Playlists tab

- [ ] "Featured" and "Explore" render as gradient variant `<SectionHeader>` — centered, title-case, gradient-clipped, visually one size tier below the Music hero h1.
- [ ] Exactly ONE Spotify preview disclaimer renders on the Playlists tab.
- [ ] The disclaimer renders **below** the hero (Featured) embed. It does not render above the Featured embed, does not render above or below the Explore grid.
- [ ] Disclaimer copy reads exactly: `Previews play here unless you're logged into a Spotify Premium account.`
- [ ] Disclaimer has no `<Info>` icon. No wrapper card or frosted background. The element is a single `<p>` with subtle grey text.
- [ ] Disclaimer color is approximately `text-white/40` (final value may be tuned in QA to `/50` or `/60` if the original reads too subtle).
- [ ] Disclaimer text size is `text-xs`, centered horizontally, width-capped to match the hero embed's visual width (`max-w-2xl` or comparable).
- [ ] The `Info` import from `lucide-react` and any `PreviewDisclaimer` wrapper component introduced in Round 1 are removed from `WorshipPlaylistsTab.tsx`.

### Ambient Sounds tab

- [ ] "Build Your Own Mix" renders as gradient variant `<SectionHeader>` — centered, title-case, gradient-clipped, matching the treatment on Featured/Explore.
- [ ] Every other section heading on the Ambient tab ("Featured" for scenes, "All Scenes", "Saved Mixes", "Nature", "Environments", "Spiritual", "Instruments") renders as default-variant `<SectionHeader>` with full `text-white` color.
- [ ] No default-variant section header on `/music` renders at `text-white/50` anywhere on the page.
- [ ] All 11 scene card gradients render noticeably duller than Round 1 — side-by-side screenshot comparison at 1440px shows the further-desaturated targets.
- [ ] Per-scene color identity is still recognizable: Gethsemane = green-ish, Still Waters = teal-ish, Midnight Rain = navy-ish, Sacred Space = warm amber-ish, Gethsemane Garden = olive, etc. Not rendered as flat grey.
- [ ] Text overlays (scene name + description) on every scene card still meet WCAG AA contrast at their rendered size.
- [ ] Any per-scene override applied to preserve identity is documented as an inline code comment in `scene-backgrounds.ts`.

### Sleep & Rest tab

- [ ] All four Scripture Collection sections (Psalms of Peace, Comfort & Rest, Trust in God, God's Promises) render as responsive grids — **not** horizontal scroll.
- [ ] Grid columns: 1 at 375px, 2 at 768px, 3 at 1440px.
- [ ] No horizontal scrollbar on any Scripture Collection row at any breakpoint.
- [ ] All cards within a row are visible without user scrolling.
- [ ] A row containing a short-title card and a long-title card renders both cards at equal height — pill rows align to the bottom.
- [ ] `ScriptureSessionCard` no longer has `min-w-[220px]`, `shrink-0`, or `snap-start` classes.
- [ ] `BedtimeStoryCard` play button renders with white background, purple Play triangle, and a subtle white glow halo (`shadow-[0_0_12px_rgba(255,255,255,0.12)]` or equivalent).
- [ ] `ScriptureSessionCard` and `TonightScripture` play buttons still render inverted (Round 1 treatment preserved — no regression).
- [ ] `BibleSleepSection` quick-start icons still render `text-primary-lt` (Round 1 treatment preserved — no regression, and explicitly not re-treated in Round 2).
- [ ] Every Sleep & Rest card's pill row uses the unified pill treatment for informational pills (duration, length on BedtimeStoryCard, voice): `bg-white/10 text-white/70 font-medium rounded-full px-2 py-0.5 text-xs whitespace-nowrap`.
- [ ] The category pill (Scripture on ScriptureSessionCard, Story on BedtimeStoryCard) renders with `bg-violet-500/15 text-violet-300` — violet category identity preserved.
- [ ] Voice pill visible text is "Male" or "Female" (not "Male voice" / "Female voice").
- [ ] Parent button `aria-label` on both card types preserves the fuller semantic phrasing ("Male voice" / "Female voice" in the readout).
- [ ] `ScriptureSessionCard` pill row fits single-line at every breakpoint from 375px upward (three pills + play button on one row).
- [ ] `BedtimeStoryCard` pill row fits single-line at 1440px (four pills + play button on one row). When width is insufficient (e.g., narrow mobile), the row wraps all pills together as a group with `flex-wrap`.

### Accessibility and verification

- [ ] Lighthouse Accessibility ≥ 95 on `/music?tab=sleep`.
- [ ] Voice pill at `text-white/70` on `bg-white/10` passes WCAG AA at 12px (verified via axe DevTools on `/music?tab=sleep`).
- [ ] Default-variant `<SectionHeader>` at full white on the page background hits 21:1 contrast (WCAG AAA).
- [ ] Aria-label copy on Sleep & Rest card parent buttons preserves pre-Round-2 semantic content.
- [ ] No new axe DevTools critical or serious issues on `/music?tab=playlists`, `/music?tab=ambient`, `/music?tab=sleep` relative to the post-Round-1 baseline.

### Visual regression (Playwright)

- [ ] `/music?tab=playlists` at 1440px and 375px: new hero size, gradient Featured/Explore headers, single disclaimer below hero embed, no disclaimer above or in Explore.
- [ ] `/music?tab=ambient` at 1440px and 375px: gradient Build Your Own Mix header, white default-variant headers for Featured/All Scenes/Saved Mixes/Nature/Environments/Spiritual/Instruments, noticeably duller scene cards vs Round 1.
- [ ] `/music?tab=sleep` at 1440px, 768px, 375px: grid-wrap layout for all four Scripture Collection sections, equal-height cards verified against a mixed short/long-title row, inverted `BedtimeStoryCard` play button, single-line unified pill rows.
- [ ] Cross-page `<PageHero>` bump verified at 1440px on all 6 consumer pages — no layout breaks, no overflow, no awkward wrapping.

### Visual hierarchy

- [ ] On `/music`, the visual size hierarchy is: Music hero h1 (60px desktop) > gradient-variant section headers (48px desktop) > default-variant section headers (14px desktop uppercase).
- [ ] The hierarchy reads clearly on a full-page screenshot at 1440px — hero dominates, gradient headings punctuate the major sections, default headings quietly label groupings.

### Edge cases

- [ ] A Scripture Collection section with fewer items than the grid column count (e.g., a 2-reading collection on a 3-column layout) renders without gaps that break the equal-height illusion.
- [ ] A BedtimeStoryCard with a very long title (3+ lines wrapped) still aligns its pill row to the bottom via `mt-auto` and matches the height of neighbors in its row.
- [ ] Scene card text overlays remain legible on the desaturation edge case where a per-scene override was applied to preserve identity.
