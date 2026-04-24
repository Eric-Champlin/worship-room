# Music Page Facelift

**Master Plan Reference:** `_plans/music-page-facelift.md` — detailed source-of-truth implementation plan already drafted (this spec captures product intent; see the plan for file-level change lists, recon source references, and the change summary).

---

## Overview

Bring `/music` into visual and structural parity with the Grow + Daily Hub design system established in the prior specs. Resolve WCAG AA contrast failures on the Sleep & Rest tab so the calming content everyone relies on before bed is actually legible. Set honest expectations around Spotify preview playback so logged-out listeners understand they need the Spotify app for full listening rather than assuming the page is broken. Fix the featured-scene duplication bug on Ambient and retire the last holdouts of the deprecated script-font heading and italic serif subtitle treatments across Music.

## User Story

As a **logged-out visitor** arriving at `/music` looking for worship music, ambient sounds to pray or study with, or scripture audio at bedtime, I want **the page to feel like the same sanctuary as the rest of the app, with readable text and honest expectations about what I can play here versus in the Spotify app**, so that **the atmosphere stays peaceful, I don't assume the player is broken, and I can find my sound category at a glance on both desktop and phone**.

## Requirements

### Functional Requirements

1. `/music` lands on the **Worship Playlists** tab by default. Direct visits to `/music` (no querystring) and Navbar clicks both resolve to `?tab=playlists`.
2. The shared-mix deep-link flow (a user following a shared ambient mix URL) continues to land on `?tab=ambient` — its entry points are not regressed by the default-tab change.
3. The hero renders "Music" in Inter with the standard gradient-clipped treatment. The deprecated `font-script` (Caveat) accent on the last word is removed.
4. The hero subtitle renders in Inter, non-italic, solid white. The deprecated Lora italic `text-white/60` treatment is removed.
5. The tab bar uses the shared `<Tabs>` primitive so the pill container, active-state halo, arrow-key roving focus, and keyboard focus ring are visually and behaviorally identical to `/grow` and `/daily`.
6. On **Worship Playlists**, a single-line disclaimer renders once above the Featured embed and once above the Explore grid, explaining that in-page playback is 30-second preview only and that tapping a track or playlist opens Spotify for full listening.
7. The Spotify embed error/fallback card (shown when an iframe fails to load within 10 seconds) uses the canonical FrostedCard treatment and a white-pill CTA labeled "Open in Spotify →" that opens the Spotify URL in a new tab with `rel="noopener noreferrer"`.
8. On **Ambient Sounds**, the three featured scenes are no longer duplicated in the All Scenes grid below the Featured row. The tab renders 11 unique scene cards (3 featured + 8 remaining) rather than 14 with duplicates.
9. Scene card gradients are desaturated ~35% so every scene feels like it belongs on the same dark-purple canvas as the rest of the app, while per-scene color identity (Gethsemane = olive-green, Still Waters = teal, Midnight Rain = navy, etc.) remains recognizable.
10. On **Ambient Sounds** > Build Your Own Mix, sound tiles are color-themed by category: Nature = emerald, Environments = amber, Spiritual = violet, Instruments = sky-blue. Inactive tiles render a subtle category-color tint; active tiles render a brighter category-color icon plus a category-colored glow halo animated via the existing `animate-sound-pulse`.
11. Build Your Own Mix category rows render as a single horizontal scroll row with edge-fade gradients on both sides and a right-edge "See more →" affordance when content overflows the viewport. The affordance is item-count aware (only appears above an overflow threshold) and hides itself when the user has scrolled to the rightmost end. Left-edge fade appears only after the user has scrolled right, signaling they can scroll back.
12. Every top-level section heading on all three tabs — "Featured", "Explore", "Saved Mixes" (when present), "All Scenes", "Build Your Own Mix", "Scripture Reading", "Psalms of Peace", "Comfort & Rest", "Trust in God", "Hope & Promise", "Bedtime Stories" — uses a shared `<SectionHeader>` primitive rendering left-aligned uppercase `text-sm text-white/50` with optional leading icon and optional right-aligned action slot. No decorative SVG dividers. No Caveat font. Treatment is visually identical across tabs.
13. On **Sleep & Rest**, the "Tonight's Scripture" label renders in solid white (21:1 contrast on the composited background), replacing the current `text-primary` purple that fails WCAG AA.
14. The TonightScripture 48px play button and every ScriptureSessionCard 32px inline play button render with a **white background, purple Play triangle, and subtle white glow halo**. The 48px button includes hover darken, press-scale feedback, and a standard focus ring; the 32px inline buttons delegate interaction state to the parent card button.
15. The "Scripture" tag pill on every ScriptureSessionCard renders with a violet-500/15 tint and violet-300 foreground, hitting WCAG AA at 12px. Any parallel "Story" badge on bedtime-story cards receives the same treatment so the tag family stays consistent.
16. Play icons on BibleSleepSection quick-start cards (Peaceful Study, Evening Scripture, Sacred Space) and the paired BookOpen icon on the Read the Bible card render in `text-primary-lt` (or `text-violet-300` if the Tailwind token is unavailable), hitting WCAG AA over the frosted card background.
17. The "Create a Routine" CTA at the bottom of the Sleep & Rest tab renders as a white pill matching the Spotify error CTA and other pattern-white-pill CTAs across the app, replacing the current outlined `text-primary` treatment that fails contrast.

### Non-Functional Requirements

- **Accessibility:** Lighthouse Accessibility ≥ 95 on `/music?tab=sleep` (the tab carrying the largest contrast burden). Every decorative icon passes WCAG AA against its background; every text-on-tint pill passes AA at its rendered size. Keyboard focus ring on all tabs, pill CTAs, sound tiles, and scroll affordance buttons. `motion-reduce:transition-none` and `motion-safe:animate-sound-pulse` gating preserved or added wherever animation is introduced.
- **Performance:** No regression in Music tab load or interactivity. Scroll rows use native browser horizontal scrolling with passive listeners; recomputing edge-fade visibility is cheap.
- **Visual parity:** Tabs align within ±2px of `/grow` and `/daily` at every breakpoint. Section heading treatment matches the Grow "Coming Up" pattern within ±2px.
- **Deep-link compatibility:** All existing `/music?tab=*` deep links continue to work.

## Auth Gating

Music is a public route. Nothing on the Music page requires authentication to use — listening, building a mix, browsing scenes, playing a scripture reading, and opening Spotify are all available to logged-out visitors. This spec introduces no new auth gates.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| Switch between Worship Playlists / Ambient Sounds / Sleep & Rest tabs | Works — tabs are fully interactive | Works — identical | N/A — no gate |
| Play a Spotify preview in the Featured or Explore embed | Works — 30-second preview plays inline (Spotify platform limit) | Works — 30-second preview unless the user is signed into Spotify in their browser session | N/A — no gate |
| Tap "Open in Spotify →" on the embed error card | Opens the Spotify track/playlist URL in a new tab | Identical | N/A — no gate |
| Select/deselect a sound tile in Build Your Own Mix | Works — toggles the sound in the ambient mix | Identical | N/A — no gate |
| Play a featured or all-scenes ambient scene | Works — starts scene playback | Identical | N/A — no gate |
| Play a TonightScripture audio or ScriptureSessionCard | Works — starts playback | Identical | N/A — no gate |
| Tap "Create a Routine" | Navigates to `/music/routines` (the page is public) | Identical | N/A — no gate |
| **Saving a mix** (pre-existing behavior on Ambient, not introduced by this spec) | Already gated by existing logic — this spec does not change it | Already functional — this spec does not change it | Whatever `SavedMixes` currently emits (out of scope to modify) |

**No new auth modals are added in this spec.** The "Saved Mixes" section only renders when the user has saved mixes, so a logged-out user simply does not see that section — no empty-state leak.

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | Hero title + subtitle stack centered. Tab pill fits the viewport; labels may shorten via `<Tabs>` primitive's own mobile handling. Worship Playlists: Featured embed full-width, Explore grid single-column stack. Spotify disclaimer text remains legible. Ambient: Featured row scrolls horizontally; All Scenes grid renders 2 columns. Build Your Own Mix category rows scroll horizontally with native touch scroll; "See more →" button stays visible when overflow detected; edge fades visible during scroll. Sleep & Rest: section cards full-width stack; quick-start cards wrap to 1-column. TonightScripture 48px play button and ScriptureSessionCard inline 32px buttons keep ≥ 44px effective touch target via parent card hitbox. "Create a Routine" white pill centered. |
| Tablet (640–1024px) | Hero layout identical to mobile but with slightly larger max-widths. Tabs remain centered in a max-w-xl container. Worship Playlists Explore grid renders 2 columns. Ambient All Scenes grid renders 3 columns. Build Your Own Mix rows: some categories (e.g., Environments, Instruments at 6 items) may fit natively; Nature (7 items) overflows, "See more →" appears. Sleep & Rest cards render 2-up where appropriate. |
| Desktop (> 1024px) | Hero full, tabs full-width pill container, Spotify disclaimer centered above each section. Worship Playlists Explore grid renders 3 columns. Ambient All Scenes grid renders 4 columns. Build Your Own Mix rows fit 6 tiles natively at 1440px (edge fade appears only on smaller desktops or with 7+ items in Nature). Sleep & Rest cards 2-up with generous spacing; ScriptureCollection rows scroll horizontally if they already do. |

### Cross-breakpoint rules

- Every interactive element maintains a ≥ 44px effective touch target on mobile.
- Scroll-row edge fades and the "See more →" button only appear when overflow is actually present; they never clutter a fully-visible row.
- The shared `<Tabs>` primitive owns arrow-key roving focus at all breakpoints — this spec does not re-implement tab keyboard handling.
- Sound tiles maintain their 90×90px footprint across breakpoints for consistent tap target and predictable scroll geometry.
- Reduced-motion: active sound-tile pulse animation, tab underline slide, and edge-fade transitions all gate on `motion-safe:` / `motion-reduce:transition-none`.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. The Music page surfaces Spotify embeds, pre-authored scene data, category-grouped sound tiles, pre-recorded scripture audio, and pre-authored bedtime stories. No user input field is introduced or modified by this spec. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Zero backend persistence. Nothing on `/music` writes to a database for logged-out visitors. Scene gradient desaturation, tab selection, and sound-tile state are client-side only. The existing `wr_session_state` (audio session, 24h expiry), `wr_favorites`, `wr_saved_mixes`, and `wr_listening_history` localStorage keys remain the canonical local persistence layer — **no new localStorage keys are introduced by this spec**.
- **Logged-in users:** Identical behavior. No user data is written to a backend table as part of this spec.
- **localStorage usage:** No new keys. The optional `themeColor` field added to `frontend/src/data/scenes.ts` is static data, not user state. No entry required in `11-local-storage-keys.md`.

## Completion & Navigation

N/A — Music is not a Daily Hub tab and has no completion tracking. Navigation behavior is limited to: default-tab routing changes to `?tab=playlists`, shared-mix deep links remain pointed at `?tab=ambient`, and the Spotify error CTA opens the Spotify app in a new tab.

## Design Notes

- **Reference:** `.claude/rules/09-design-system.md` for color palette, FrostedCard tier system, animation tokens, Tabs primitive reference, and Round 3 visual patterns. `_plans/recon/design-system.md` was found during spec prep and will be used by `/plan` to pin exact CSS values.
- **Existing components to reuse:**
  - `<Tabs>` from `@/components/ui/Tabs` — the canonical tab bar primitive used by `/grow` and `/daily`.
  - `<Button variant="light">` — the white-pill CTA pattern established in the Grow spec.
  - `<PageHero>` — the shared hero component. This spec removes the `scriptWord` prop from the Music invocation; if the prop is currently required, the component is updated to make it optional (a net improvement for every consumer).
  - `animate-sound-pulse` — the existing active-sound-tile pulse animation.
  - `GRADIENT_TEXT_STYLE` — the canonical gradient-clipped headline treatment on hero titles.
- **New primitives introduced by this spec** (will be marked `[UNVERIFIED]` during planning until visually confirmed against the design system recon):
  - **`<SectionHeader>`** — Shared left-aligned uppercase section heading matching the Grow "Coming Up" pattern. `text-sm font-semibold uppercase tracking-wide text-white/50` with optional leading icon and optional right-aligned action slot. No decorative dividers. Defaults to `h2`, can render as `h3` for nested subsections.
  - **`<ScrollRow>`** — Horizontal scroll container with edge-fade gradients on both sides, scroll-position-aware fade visibility, and an overflow-aware "See more →" chevron button on the right. Preserves native touch scroll and `snap-x` behavior; uses passive scroll listeners. Edge fades use `from-hero-bg to-transparent`.
  - **`SOUND_CATEGORY_COLORS` constant** — Central color map for the four Build Your Own Mix groupings (Nature = emerald, Environments = amber, Spiritual = violet, Instruments = sky). Each entry exposes `bgClass`, `borderClass`, `iconInactiveClass`, `iconActiveClass`, and `activeGlow`. Foregrounds tuned to meet WCAG AA for decorative icons over FrostedCard background.
- **Visual aspects that must match existing patterns (design-system recon will pin exact values):**
  - Tab pill container: `rounded-full border border-white/[0.12] bg-white/[0.06] p-1`.
  - Tab active state: `bg-white/[0.12] border border-white/[0.15]` + purple halo `shadow-[0_0_12px_rgba(139,92,246,0.15)]`.
  - Frosted card treatment: `rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]`.
  - White pill CTA: `variant="light"` Button with `text-primary` foreground.
  - Section heading: `text-sm font-semibold uppercase tracking-wide text-white/50` with optional 16×16px leading icon.
- **Patterns retired on `/music`:**
  - `<HeadingDivider>` decorative SVG dividers (Featured/Explore on Playlists, anywhere else they leaked onto Music). The component remains in the file tree for other consumers; do not delete until `/plan` verifies no remaining references on `/music`.
  - `font-script` Caveat hero accent.
  - Italic Lora serif subtitle (`font-serif italic text-white/60`).
  - `text-primary` on dark backgrounds for decorative icons and labels (replaced by `text-white`, `text-primary-lt`, or `text-violet-300` depending on context).
  - Outlined `border-primary text-primary` CTAs (replaced by white pills).
  - Bespoke tab-bar logic with manual `translateX` underline math in `MusicPage.tsx`.

## Out of Scope

- **Play button style inversion across the other 15 audio components.** This spec inverts only `TonightScripture` (48px) and `ScriptureSessionCard` (inline 32px) — the two buttons specifically called out on screenshot #6. Broader inversion across `AudioPlayerMini`, `AudioPlayerExpanded`, `AudioPlayButton`, `ScriptureSoaking`, `RoutineCard`, `ReadAloudButton`, `SharedMixHero`, `SavedMixCard`, `TimerTabContent`, `SceneCard`, `FeaturedSceneCard`, `BibleSleepSection`, `AudioPill`, `BedtimeStoryCard`, and `DrawerNowPlaying` is deferred to a follow-up spec.
- **Spotify OAuth integration.** Preview-only in-page playback is accepted as a Spotify platform constraint. The spec addresses UX around the constraint (honest disclaimer, white-pill CTA funneling to the Spotify app where listens count as streams) rather than trying to engineer around it.
- **Refactoring `AmbientBrowser`, `SleepBrowse`, `SoundGrid`, or other audio components beyond the specific visual and structural changes called out above.** Behavior and data model remain as-is except where explicitly changed.
- **Ambient scene data model changes** beyond adding an optional `themeColor` field (added now for future use, not consumed in this spec).
- **Shared `<PageHero>` component refactor.** Hero changes happen inline via the props `MusicPage` passes, or in `PageHero.tsx` only if making `scriptWord` optional; no broader restructuring.
- **`<HeadingDivider>` component deletion from the repo.** Other consumers may still use it; this spec retires it from `/music` only. Full removal is a separate cleanup spec.
- **New localStorage keys or persistence.** None introduced.
- **Backend / API changes.** Phase 3+ work. None in this spec.
- **Music recon JSON files referenced in `_plans/music-page-facelift.md`** (`music-recon-playlists.json`, `music-recon-ambient.json`, `music-recon-sleep.json`) were **not found** in `_plans/recon/`. If `/plan` needs exact computed values for these tabs that are not already captured in `_plans/recon/design-system.md`, the planner should flag them as `[UNVERIFIED]` or prompt the user to run `/playwright-recon --internal http://localhost:5173/music` before executing.

## Acceptance Criteria

### Hero + tab bar

- [ ] `/music` h1 renders "Music" in Inter, gradient-clipped. No `font-script` / Caveat class anywhere in the h1 or its descendants.
- [ ] Visual weight of the `/music` h1 matches `/grow` h1 within ±2px.
- [ ] `/music` subtitle renders in Inter (not Lora), non-italic, solid white (not 60% white).
- [ ] If the subtitle treatment change in `<PageHero>` affects other pages (`/grow`, `/daily`, challenge detail pages), those pages are visually improved — not broken — verified via Playwright at 1440px and 375px.
- [ ] `/music` tabs are visually indistinguishable from `/grow` tabs and `/daily` tabs at every breakpoint; all three share y ±2px.
- [ ] Active tab pill uses `rounded-full border border-white/[0.12] bg-white/[0.06] p-1` container and `bg-white/[0.12] border border-white/[0.15]` + `shadow-[0_0_12px_rgba(139,92,246,0.15)]` active fill.
- [ ] Arrow-key roving tabindex works on `/music` tabs (owned by `<Tabs>` primitive).
- [ ] Deep links `/music?tab=playlists`, `/music?tab=ambient`, `/music?tab=sleep` all resolve correctly.
- [ ] Keyboard focus ring on tabs matches Daily Hub pattern.

### Default routing

- [ ] Navigating from the Navbar `Music` link lands on `?tab=playlists`.
- [ ] Direct visits to `/music` (no querystring) redirect or resolve to `?tab=playlists`.
- [ ] Shared-mix deep links still land on `?tab=ambient` (verify one representative example still works).

### Worship Playlists tab

- [ ] "Featured" and "Explore" section headings render left-aligned uppercase `text-sm text-white/50` via `<SectionHeader>`. No decorative SVG dividers, no Caveat font.
- [ ] Spotify preview disclaimer renders once above the Featured embed and once above the Explore grid. Copy reads exactly: "30-second previews play here. Tap any track or playlist to open in Spotify for full listening."
- [ ] Disclaimer icon is `Info` from lucide, `h-3.5 w-3.5`, color `text-white/50` (same as the accompanying text).
- [ ] Disclaimer does not render on inactive tabs (gated by the existing tab-panel `hidden` attribute).
- [ ] Spotify embed error card uses canonical FrostedCard treatment (`rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm` + the standard frosted shadow).
- [ ] Spotify error CTA is a white pill with `text-primary` foreground, label "Open in Spotify →" (trailing right arrow), `target="_blank"` + `rel="noopener noreferrer"` preserved.
- [ ] Clicking the error CTA opens the Spotify URL in a new tab.

### Ambient Sounds tab

- [ ] Featured row renders 3 cards (Garden of Gethsemane, Still Waters, Midnight Rain).
- [ ] All Scenes grid renders 8 cards (all scenes except the 3 featured ones). Total unique scene card count: 11. No scene renders twice.
- [ ] Section heading hierarchy on Ambient is: Saved Mixes (conditional) → Featured → All Scenes → Build Your Own Mix, each using `<SectionHeader>` with identical treatment.
- [ ] All 11 scene card gradients are desaturated ~35% so they visually belong to the same dark-purple canvas; per-scene color identity (Gethsemane = olive-green, Still Waters = teal, Midnight Rain = navy, etc.) is still recognizable.
- [ ] Scene name and description text overlays remain legible on every scene card — verified visually on all 11 cards at 1440px and 375px.
- [ ] Build Your Own Mix tiles render color-tinted by category: Nature = emerald, Environments = amber, Spiritual = violet, Instruments = sky. Inactive tiles show subtle tint + `/70` opacity category-color icon.
- [ ] Active sound tiles render bright (full-opacity) category-color icon + category-colored glow halo `shadow-[0_0_16px_<color>]` + `animate-sound-pulse`. Active state reflects within 250ms of tap.
- [ ] Active glow halo color changes per category (no uniform purple across all categories).
- [ ] Category heading labels ("Nature", "Environments", "Spiritual", "Instruments") use the `<SectionHeader>`-style uppercase `text-white/50` treatment.
- [ ] Build Your Own Mix category rows render as single horizontal scroll rows — they do NOT wrap to a second line.
- [ ] Nature row (7 items) shows "See more →" chevron button and left/right edge fades appropriately based on scroll position.
- [ ] Environments and Instruments rows (6 items each) show no overflow affordance at 1440px when they fit natively; affordance appears when viewport narrows enough to trigger overflow.
- [ ] Featured scenes row (3 items) never shows overflow affordance.
- [ ] Clicking "See more →" scrolls 300px right smoothly; the button auto-hides when scrolled to the rightmost end.
- [ ] Left-edge fade only appears when scrolled away from the left edge; right-edge fade only appears when more content is to the right.
- [ ] Scene data file gains an optional `themeColor` field (not consumed by this spec, added for future use).

### Sleep & Rest tab

- [ ] All top-level section headings ("Scripture Reading", "Psalms of Peace", "Comfort & Rest", "Trust in God", "Hope & Promise", "Bedtime Stories") use `<SectionHeader>`. Treatment identical to other Music tabs and `/grow`.
- [ ] "Tonight's Scripture" label renders in solid white — **not** `text-primary`. Contrast ratio on composited `#08051A` background is 21:1 (WCAG AAA).
- [ ] TonightScripture 48px play button renders `bg-white text-primary` with `shadow-[0_0_20px_rgba(255,255,255,0.15)]` glow, hover darkens to `bg-gray-100`, `active:scale-[0.96]` press feedback, standard focus ring with `ring-primary-lt` and `ring-offset-hero-bg`.
- [ ] Every ScriptureSessionCard inline 32px play button renders `bg-white text-primary` with `shadow-[0_0_12px_rgba(255,255,255,0.12)]` glow. No duplicate hover/focus on inner `<div>` — parent button owns interaction state.
- [ ] "Scripture" tag pill renders `bg-violet-500/15 text-violet-300` at 12px — verified ≥ 4.5:1 contrast via axe DevTools on `/music?tab=sleep`.
- [ ] If a "Story" or parallel badge exists on `BedtimeStoryCard.tsx`, same `bg-violet-500/15 text-violet-300` treatment is applied — verified via grep before merging.
- [ ] BibleSleepSection quick-start card play icons (Peaceful Study, Evening Scripture, Sacred Space) render `text-primary-lt` (or `text-violet-300`); passes WCAG AA on card background.
- [ ] Read the Bible card BookOpen icon matches the new play-icon color.
- [ ] "Create a Routine" CTA is a white pill (`Button variant="light" size="sm" asChild`) wrapping an `<a href="/music/routines">`. Passes WCAG AA.

### Shared primitives

- [ ] `<SectionHeader>` exists at `@/components/ui/SectionHeader` and is used by every top-level section heading on all three Music tabs.
- [ ] `<ScrollRow>` exists at `@/components/ui/ScrollRow` and is used by Build Your Own Mix category rows (minimum); AmbientBrowser Featured row optionally adopts it for consistency per the plan.
- [ ] `SOUND_CATEGORY_COLORS` exists at `@/constants/soundCategoryColors` and is the single source of truth for category tints, borders, icon colors, and active glows across `SoundGrid` and `SoundCard`.

### Accessibility & verification

- [ ] Lighthouse Accessibility ≥ 95 on `/music?tab=sleep`.
- [ ] axe DevTools reports no critical or serious issues on `/music?tab=playlists`, `/music?tab=ambient`, `/music?tab=sleep`.
- [ ] "Tonight's Scripture" label contrast ratio confirmed ≥ 21:1.
- [ ] "Scripture" tag on every ScriptureSessionCard confirmed ≥ 4.5:1 at 12px.
- [ ] "Create a Routine" CTA confirmed ≥ 4.5:1.
- [ ] Quick-start card play icons on BibleSleepSection confirmed ≥ 4.5:1.
- [ ] Reduced-motion preference respected: `animate-sound-pulse` gated behind `motion-safe:`, tab underline slide + edge-fade transitions gated behind `motion-reduce:transition-none`.
- [ ] Screen reader on Sleep tab announces order: "Tonight's Scripture" label → card title → chips → "Play" button — matching visual order.

### Visual regression

- [ ] Playwright verification pass at 1440px and 375px on `/music`, `/music?tab=playlists`, `/music?tab=ambient`, `/music?tab=sleep` — no "CLOSE" verdicts, ±2px tolerance.
- [ ] Visual diff against `/grow` tab bar and section headings confirms parity within ±2px.

### Edge cases

- [ ] Playlist with a long name in the Spotify error card wraps or ellipsizes gracefully (does not overflow the card).
- [ ] Empty "Saved Mixes" state (logged-out or user with no saved mixes) hides the entire Saved Mixes section — no empty-state leak.
- [ ] User with 20+ saved mixes: `<ScrollRow>` handles arbitrary count without layout break.
- [ ] Offline reload of `/music?tab=playlists` (DevTools → Offline → reload) renders the Spotify embed error card with the white-pill CTA.
