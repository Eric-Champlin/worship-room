# Spec 5: Local Support Visual Migration

**Master Plan Reference:** Direction document at `_plans/direction/local-support-2026-05-04.md` is the locked decision set (17 numbered decisions). Recon at `_plans/recon/local-support-2026-05-04.md` (552 LOC) is the verified pre-state inventory across all 3 routes, 462-LOC shared shell, 9 child components, 9 test files, and 2,112 LOC grand total. This spec follows the Round 3 visual rollout pattern established by Spec 4A (Dashboard foundation — BackgroundCanvas + FrostedCard primitive + subtle Button variant + global ghost link migration), Spec 4B (Dashboard data widgets — Tonal Icon Pattern across 11 widgets), and Spec 4C (Dashboard social/recap/tiles — pattern application across 8 more widgets + ceremony heading typography). Patterns this spec USES are all already shipped: FrostedCard `default` and `subdued` variants, multi-bloom `BackgroundCanvas`, Button `subtle` variant, the violet tab/segmented-control pattern from DailyHub, the Tonal Icon Pattern from Dashboard 4B, and the existing `FeatureEmptyState` primitive. Patterns this spec MODIFIES: none. Patterns this spec INTRODUCES: none.

**Branch discipline:** Stay on `forums-wave-continued`. Do NOT create new branches, commit, push, stash, reset, or run any branch-modifying git command. The user manages all git operations manually. If the working tree is on a different branch than expected, STOP and ask.

---

## Affected Frontend Routes

- `/local-support/churches` — primary surface; receives every shell-level change (BackgroundCanvas, hero migration, tab pattern, mobile view toggle, saved-tab empty state) plus listing-card/share-dropdown/CTA migrations via the shared components
- `/local-support/counselors` — second sibling; identical shell changes; the amber regulatory disclaimer chrome is preserved AS-IS per Decision 10 (the only Local Support route where the disclaimer renders)
- `/local-support/celebrate-recovery` — third sibling; identical shell changes plus the `extraContent` slot migration where the "What is Celebrate Recovery?" mini-card moves from inline `bg-white/10 ... backdrop-blur-sm rounded-xl` to `<FrostedCard variant="subdued">`
- `/` — regression surface (Dashboard — verify no drift after BackgroundCanvas opacity tuning if applied here)
- `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate` — regression surface (DailyHub tab pattern source — verify nothing drifts)
- `/bible` — regression surface (BibleLanding — same atmospheric system)
- `/bible/plans` — regression surface

---

## Overview

Local Support is the surface users visit during difficult moments — finding a counselor when struggling, a Celebrate Recovery group when battling addiction, a church when spiritually disconnected. The current visual treatment is functional but predates the Round 3 system: it uses `<GlowBackground variant="center">` in the hero (one of the last two consumers of that pre-Round-3 atmospheric layer outside the homepage), rolls-its-own card chrome on `ListingCard`, ships four white-pill primary CTAs (Use My Location, Search, Try Again, Get Directions), uses an outdated white-pill active-tab pattern in three places (the Search Results / Saved tab bar plus the mobile List View / Map View toggle), and renders the only light-themed dropdown left in the app on `ListingShareDropdown`. Iconography is inconsistent — bookmark and visit-recorded states use semantic `text-success` instead of the Tonal Icon Pattern's tonal palette, and ListingCTAs do not yet wear the QuickActions categorical color treatment.

This spec migrates Local Support's hero atmosphere, card chrome, dropdown theme, button patterns, and tonal icons to the Round 3 system while honoring the surface's calm utility-surface mood. The core constraint is restraint: Local Support is a longer-dwell utility surface (users scroll and read carefully when looking for a counselor or a CR group), so atmospheric blooms that work on a quick-scan Dashboard could feel too active here. CC verifies and tunes BackgroundCanvas opacity during execution if needed (Decision 1 explicitly authorizes a small reduction). The amber regulatory disclaimer on the Counselors page is preserved AS-IS as a deliberate exception parallel to GrowthGarden's earth-tone exception on Dashboard (Decision 10) — different semantic purpose ("important — read this") deserves different chrome. The form input idiom on the location text input, range slider, and sort/filter selects also stays AS-IS (Decision 8) — quieter "utility input" chrome is correct here, distinct from the violet-glow textarea pattern used in DailyHub Pray/Journal where the input register is emotional/expressive rather than utility. The `VisitNote` textarea is a borderline case flagged for future migration to violet-glow if user feedback signals it (Decision 8).

Three secondary deliverables ride alongside the visual migration:

1. **Pre-existing test failure cleanup (Decision 13).** The 4 baseline failures listed in CLAUDE.md as "logged-out mock listing cards in Local Support / Counselors / Celebrate Recovery / Churches" stem from rule/code drift: tests were written expecting search to be auth-gated (which `02-security.md:23` claims) but the implementation has never gated search. Per Decision 12, open search is the correct product behavior — forcing a logged-out user to sign in to look up local churches/counselors/CR groups is hostile and contradicts Worship Room's positioning as a low-friction support resource. Especially for crisis-adjacent surfaces (Counselors, CR), removing barriers to discovery is a moral imperative, not just a UX preference. Tests are wrong; code is correct. Update tests to match actual behavior. After Spec 5, the frontend regression baseline drops from 11 → 7.
2. **Documentation updates (Decisions 12 and 15).** `.claude/rules/02-security.md` line 23 is reworded to clarify that Local Support search and results display are public, while bookmark and visit-recording actions are auth-gated. `.claude/rules/11-local-storage-keys.md` adds documentation for the previously undocumented `wr_bookmarks_<category>` localStorage key family (three variants: `wr_bookmarks_churches`, `wr_bookmarks_counselors`, `wr_bookmarks_celebrate-recovery`).
3. **Decision 14 verification.** The `?template=cr-buddy` query parameter on the CelebrateRecovery → Prayer Wall ListingCTA link does not appear to be consumed by the Prayer Wall route currently. Per Decision 14, default behavior is to keep and ignore (the parameter is harmless and signals intent for future implementation). CC verifies during execution and surfaces a follow-up if a clearer path emerges; deep-link wiring on the Prayer Wall side is explicitly out of scope.

This spec is visual + class-string + test + docs. No data fetching changes, no hook changes, no service changes, no new localStorage keys, no API/backend changes, no Leaflet internals (only the selected-state ring color updates from `ring-primary` to `ring-violet-400/60`). Behavioral preservation is non-negotiable: every existing test that asserts on behavior (click handlers, navigation logic, conditional rendering branches, geolocation flow, debounced search, ARIA tablist keyboard navigation, sort/filter logic, pagination/load-more, bookmark and visit toggling, share dropdown copy/web-share fallback) must continue to pass without modification. Tests that asserted on specific class names changed by this spec are updated to the new tokens. The 4 pre-existing failures get fixed.

After this spec ships, the Round 3 visual migration is complete across all four major surfaces (Homepage → DailyHub → BibleLanding/plans → Dashboard → Local Support). Modal/overlay sweep and the Leaflet bundle-size optimization remain as follow-ups.

## User Story

As a **logged-out visitor or logged-in user navigating from Dashboard to Local Support during a difficult moment**, I want the page to feel like the same calm, supportive room I just left — atmospheric blooms gently visible behind the content, listing cards wearing the same FrostedCard chrome as the rest of the app, the Search Results / Saved tab bar and the mobile List View / Map View toggle reading as the same violet pattern I just saw on DailyHub, action CTAs (Use My Location, Search, Try Again, Get Directions) matching the subtle Button family used elsewhere, and a dark share dropdown matching every other dropdown in the app — so that the visual register doesn't break the emotional thread when I'm searching for a church, a counselor, or a CR group. When I bookmark a place I want the icon to read as warm-mint emerald, signaling care and saving rather than the harsher semantic green; when I record a visit the MapPin should warm to amber, signaling the courage of having shown up. When I tap a "Pray for this church" or "Journal about this counselor" CTA inside an expanded listing, I want each tile's icon to wear the same categorical color (pink for prayer, sky for journaling, violet for sharing to the prayer wall) as Dashboard's QuickActions. And when I land on the Counselors page, I want the regulatory disclaimer banner to keep its amber-warning urgency — not be softened into another frosted card — because that boundary deserves to look different from the rest of the page.

## Requirements

### Functional Requirements

#### Pre-execution recon (mandatory before any code change)

1. Verify the working branch (`forums-wave-continued`) contains Spec 4A + Spec 4B + Spec 4C all merged. Specifically:
   - `BackgroundCanvas` wraps `<main>` on the Dashboard route (`/`) and on BibleLanding.
   - `FrostedCard` exposes `default`, `subdued`, and `accent` variants in `frontend/src/components/homepage/FrostedCard.tsx`.
   - The `subtle` Button variant exists in the shared Button component (used by Spec 4A's global solid → subtle migration). If the variant lives at a non-obvious export path, confirm it before referencing.
   - The violet tab/segmented-control pattern is in use on DailyHub (canonical class strings: active = `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`, inactive = `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`, outer wrapper = `rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`).
   - The Tonal Icon Pattern is documented in the Dashboard direction doc (`_plans/direction/dashboard-2026-05-04.md` Decision 11) and was applied across Specs 4B and 4C. The Local Support direction doc (Decision 7) extends the table to Local Support's iconography.
2. Verify the direction doc at `_plans/direction/local-support-2026-05-04.md` is present and the locked decisions referenced throughout this spec match — particularly Decision 1 (BackgroundCanvas, with explicit authorization to tune opacity downward if blooms feel too active during a 5-minute counselor search), Decision 2 (ListingCard → FrostedCard default), Decision 5 (ListingShareDropdown light → dark), Decision 7 (Tonal Icon Pattern table), Decision 8 (form input chrome stays — VisitNote textarea is borderline-deferred), Decision 10 (Counselors disclaimer preserved AS-IS as regulatory exception), Decision 11 (saved-tab empty state → FeatureEmptyState with the rewritten "Your saved {category}" / "Bookmark places to find them again later." copy), Decision 12 (search remains open to logged-out users; rule rewording in scope), Decision 13 (4 pre-existing test failures fixed), Decision 14 (`?template=cr-buddy` Prayer Wall query parameter — keep and ignore by default, surface follow-up if clearer path emerges), Decision 15 (`wr_bookmarks_<category>` documentation), Decision 17 (CelebrateRecovery `extraContent` mini-card → FrostedCard subdued).
3. Verify the recon at `_plans/recon/local-support-2026-05-04.md` is present.
4. **Capture a test baseline before any change.** Run `cd frontend && pnpm test --run --reporter=verbose 2>&1 | tail -80` and `pnpm typecheck`. Record total pass/fail counts. The post-Spec-4C baseline target is **8,811 pass / 11 pre-existing fail** per CLAUDE.md (Build Health section). Of those 11, **4 are Local Support tests** (logged-out mock listing cards in Local Support / Counselors / Celebrate Recovery / Churches) — these get fixed in Change 15 of this spec, dropping the new baseline to **7 pre-existing fail**. Any NEW failure introduced by this spec must be explicitly reconciled before the spec is considered complete.
5. Read each of the 10 implementation files in scope plus the 9 test files to confirm current import sets (lucide-react icons, Button/FrostedCard/FeatureEmptyState locations), current chrome tokens, current conditional rendering branches, current ARIA wiring on the tab bar and mobile view toggle (`role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls` / roving tabindex / Home/End/ArrowLeft/Right keyboard navigation / `aria-pressed` on mobile toggles).
6. **Verify the Button component API for the "Get Directions" link.** The "Get Directions" inside the expanded ListingCard is an `<a>` element, not a `<button>`. Read the Button component to determine whether it supports `as="a"`, `asChild`, or polymorphic rendering. If yes, use it. If no, apply the subtle-variant class string manually to the anchor — the canonical subtle-variant class signature is documented in Change 10 below. Do NOT introduce a new wrapper component to bridge the gap.
7. **Verify the `wr_bookmarks_<category>` keys are not already documented.** Grep `.claude/rules/11-local-storage-keys.md` for `wr_bookmarks` before adding the entry from Change 14. If already present, reconcile against Decision 15's schema and update; do not duplicate.
8. **Verify Decision 14 — the `?template=cr-buddy` query parameter on the CelebrateRecovery Prayer Wall ListingCTA.** Grep the Prayer Wall route components for any `template` query parameter consumer. If the parameter is parsed and consumed somewhere, surface as recon finding — keep parameter as-is. If unused (default expectation), keep parameter as-is (harmless, signals intent for future implementation) and note in the spec follow-up section.
9. Verify ResultsList and ResultsMap behaviors. ResultsList sort/filter selects use the form input idiom that stays per Decision 8 — verification only, no class change. ResultsMap selected-state ring (added when `selectedPlaceId` matches) currently uses `ring-2 ring-primary` — update to `ring-2 ring-violet-400/60` for system alignment (per Decision 2 closing paragraph). Leaflet internals (tile layer URL, marker bindings, popup styling, ErrorBoundary, MapFallback) are out of scope.

#### Tonal Icon Pattern — application convention (continuation from Specs 4B/4C)

The pattern lives in `_plans/direction/dashboard-2026-05-04.md` Decision 11 and was debuted in Spec 4B. Local Support's direction doc Decision 7 extends the table to this surface. Restated here for executor reference:

**The pattern:**
- Card chrome stays in the violet/glass system (already shipped in 4A; ListingCard migrates in Change 3 of this spec).
- Icon container is a small rounded square at `bg-white/[0.05]` when the existing structure uses a container. When the existing structure has the icon inline with the heading or the action affordance (no container), keep it inline and apply the tonal color directly.
- Icon itself carries a tonal color signaling category. Colors are muted/pastel, never fully saturated.
- The icon is the ONLY colored element in the card; everything else stays violet/glass.

**Tonal token assignments for Spec 5** (CC may select a 1-step-lighter or darker shade per usage during execution if rendered contrast against the FrostedCard chrome reads incorrectly — these are the families/defaults locked at planning time):

| Surface                                           | Icon          | Tonal default            | Family rationale                                                          |
| ------------------------------------------------- | ------------- | ------------------------ | ------------------------------------------------------------------------- |
| StarRating (rating display)                       | Star          | `fill-amber-400 text-amber-400` (preserved) | Universal rating color, already correct per Decision 7        |
| Bookmark (when bookmarked)                        | Bookmark      | `fill-emerald-300 text-emerald-300`         | Mint — saving/keeping/growth                                  |
| Bookmark (unbookmarked)                           | Bookmark      | `text-white/50` (preserved)                 | Affordance, not state                                          |
| VisitButton (when visited)                        | MapPin        | `text-amber-300`                            | Warm gold — warmth of showing up                              |
| VisitButton (unvisited)                           | MapPin        | `text-white/50` (preserved)                 | Affordance, not state                                          |
| SearchControls "Use My Location"                  | MapPin        | `text-sky-300`                              | Sky — navigation/wayfinding                                    |
| SearchControls "Search" submit                    | Search        | inherits Button text color (neutral white)  | Within subtle Button — neutral                                 |
| ListingCard address row                           | MapPin        | `text-white/50` (preserved or set if drift) | Utility metadata, not categorical                              |
| ListingCard phone row                             | Phone         | `text-white/50` (preserved or set if drift) | Utility metadata, not categorical                              |
| ListingCard expanded "Get Directions"             | ExternalLink  | inherits anchor text color (neutral white)  | Within subtle-variant link — neutral                           |
| ListingCard expanded website link                 | ExternalLink  | `text-white/50` (preserved or set if drift) | Utility metadata, not categorical                              |
| ListingCard expand chevron                        | ChevronDown   | `text-white/60` (verify — preserve if so)   | Affordance                                                     |
| ListingCTAs tile 1 (Pray)                         | Heart         | `text-pink-300`                             | Pink — warm care; matches QuickActions Pray tile               |
| ListingCTAs tile 2 (Journal)                      | BookOpen      | `text-sky-300`                              | Sky — study/scripture; matches QuickActions Journal tile       |
| ListingCTAs tile 3 (Share to Prayer Wall)         | MessageSquare | `text-violet-300`                           | Violet — community/sharing                                     |
| Loader2 (loading state inside Search button)      | Loader2       | inherits Button text color (neutral white)  | Status                                                         |
| AlertCircle (SearchError)                         | AlertCircle  | `text-danger` (preserved)                   | Semantic error color — deliberate exception                    |
| MapPin (SearchPrompt empty state)                 | MapPin        | `text-white/40` (verify — set if drift)     | Empty state, muted                                             |
| SearchX (NoResults empty state)                   | SearchX       | `text-white/40` (verify — set if drift)     | Empty state, muted                                             |
| Bookmark (saved-tab empty state, new)             | Bookmark      | `text-white/40` (via FeatureEmptyState `iconClassName`) | Empty state, muted; affordance teaching          |
| Copy / Mail / MessageSquare (share dropdown items) | (lucide)     | `text-white/60` (after light → dark migration) | Item-row affordance icons; muted within dark dropdown      |
| Check (share dropdown copied feedback)            | Check         | `text-emerald-300`                          | Mint — success/saving (replaces existing semantic green)       |
| Facebook / X (share dropdown brand icons)         | inline SVGs   | brand colors preserved                      | Brand identifiers — semantic exception                         |

**Application discipline:** Apply the pattern in a way that fits each component's existing structure. Do not impose a container where none exists if it would disturb the layout; do not strip a container if it already reads correctly. The end-state contract is "icon carries tonal color, everything else stays in-system." For ListingCTAs specifically, each tile's icon is part of the tile's primary visual affordance — the application is class-string-only on each tile; the size, layout, and structure of each tile stay as-is.

#### Change 1 — BackgroundCanvas added to LocalSupportPage shell

Modify `frontend/src/components/local-support/LocalSupportPage.tsx`.

Wrap both `<LocalSupportHero>` and `<main>` inside `<BackgroundCanvas>`. Navbar (transparent) and SiteFooter stay outside the canvas. Existing `bg-dashboard-dark` on the outer div stays as base color; BackgroundCanvas blooms layer on top. The hero's existing `<GlowBackground variant="center">` wrap is removed in Change 2 — once removed, the hero sits naturally inside the parent BackgroundCanvas without competing atmospheric layers.

**Atmospheric tuning authorization (Decision 1).** BackgroundCanvas opacity values used elsewhere may need slight reduction for Local Support specifically. This is a longer-dwell utility surface — atmospheric blooms that work on a quick-scan Dashboard could feel too active during a 5-minute counselor search. CC verifies the rendered atmosphere during execution. If the blooms feel too active, tune opacity downward (e.g., reduce one or more bloom layers' opacity by ~20–30%) and document the choice. Tuning is preferred over removal — atmospheric continuity with Dashboard/BibleLanding is the primary goal.

#### Change 2 — LocalSupportHero migration

Modify `frontend/src/components/local-support/LocalSupportHero.tsx`.

Remove the `<GlowBackground variant="center">` wrap and the corresponding import. The hero's `<section>` element, the `<h1>` with `style={GRADIENT_TEXT_STYLE}` (the canonical white-to-purple gradient text — Decision 16 explicitly preserves this), the `<p>` subtitle, all spacing classes (`pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40 px-4 text-center`), and the accessible heading id are preserved exactly. The `extraContent` prop slot is preserved as a slot — the card it renders for CelebrateRecovery migrates separately in Change 7 (the consumer changes, not the slot). The `action` prop slot (currently defined but unused by any consumer) stays as-is.

#### Change 3 — ListingCard chrome migration

Modify `frontend/src/components/local-support/ListingCard.tsx`.

The current root `<article>` chrome (`rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20`) migrates to `<FrostedCard as="article" variant="default" className="p-5 sm:p-6" aria-labelledby={titleId}>`. Add `import { FrostedCard } from '@/components/homepage/FrostedCard'` (verify exact import path during execution).

**Preserved structure (non-negotiable):** photo + info row (flex gap-4), photo or `<ImageOff>` placeholder, info column with `<h3>` + distance pill, address row with `<MapPin>`, phone row with `<Phone>` (when present), `<StarRating>`, border-t actions row (bookmark, share, optional VisitButton, expand), `<VisitNote>` textarea (when visit recorded), expanded details section with `inert` attribute when collapsed.

**Selected-state ring update.** Currently `ring-2 ring-primary` is added to the article when `place.id === selectedPlaceId` (selected from a map marker click). Update to `ring-2 ring-violet-400/60` for system alignment.

**Hover redundancy removal.** FrostedCard provides hover lift via its variant; the existing `lg:hover:shadow-md lg:hover:shadow-black/20` becomes redundant — remove. Verify the rendered hover behavior matches FrostedCard's default hover treatment.

Do NOT impose a `bg-white/[0.05]` rounded-square icon container on the address/phone metadata icons — they sit inline with their text rows per existing structure. Apply tonal colors inline per the icon table above.

#### Change 4 — ListingSkeleton chrome alignment

Modify `frontend/src/components/local-support/SearchStates.tsx`.

The `<ListingSkeleton>` root (currently `rounded-xl border border-white/10 bg-white/[0.06] p-5 sm:p-6` mirroring the OLD ListingCard chrome) migrates to `<FrostedCard variant="default" className="p-5 sm:p-6 motion-safe:animate-pulse">`. Skeleton blocks (the gray `<div>`s representing photo, name, address) stay unchanged — they're shimmer placeholders, not chrome. The loading-to-loaded transition must feel continuous.

#### Change 5 — Search controls migration

Modify `frontend/src/components/local-support/SearchControls.tsx`.

**5a — "Use My Location" button.** Replace the rolls-own white-pill (`inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] ...`) with `<Button variant="subtle" size="md" onClick={handleUseMyLocation} disabled={isGeolocating} type="button">`. The `<MapPin className="h-4 w-4" />` inside gains tonal color `text-sky-300` per the icon table.

**5b — "Search" submit button.** Replace the rolls-own white-pill with `<Button variant="subtle" size="md" type="submit" disabled={!locationInput.trim() || isLoading}>`. Loading state preserves the existing `Loader2` spin animation. The `Search` icon (when not loading) stays neutral (inherits Button text color).

**5c — Form input + range slider.** No change to chrome per Decision 8. The text input keeps `bg-white/[0.06] border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20`. The range slider keeps `accent-primary` plus the existing mile markers. **Focus ring contrast verification (mandatory).** After Change 1 lands the BackgroundCanvas atmosphere, verify the input's `focus:ring-primary/20` ring still reads correctly. If too purple-on-purple muddy, fall back to `focus:ring-violet-400/30` and document the choice. Verify only — do not change preemptively.

#### Change 6 — Tab bar + mobile view toggle pattern migration

Modify `frontend/src/components/local-support/LocalSupportPage.tsx` at the tab bar (`role="tablist"`, ~line 278 — "Search Results" / "Saved (N)") and the mobile view toggle (~line 376 — "List View" / "Map View").

**Migrate to the violet system tab pattern.**
- Outer wrapper: `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`
- Active state: `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`
- Inactive state: `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`

Apply to BOTH the tab bar AND the mobile view toggle. If a third instance of the white-pill active/muted-pill inactive pattern exists on the page that this spec missed, apply the same migration there too.

**ARIA preservation (non-negotiable).** Preserve all existing ARIA wiring exactly: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, roving tabindex, Home/End/ArrowLeft/ArrowRight keyboard navigation on the tab bar; `aria-pressed` on the mobile toggle buttons. Tests that exercise the keyboard navigation must continue to pass without modification.

#### Change 7 — CelebrateRecovery extraContent migration

Modify `frontend/src/pages/CelebrateRecovery.tsx`.

The current `extraContent` slot inline (`<div className="mx-auto mt-4 max-w-2xl rounded-xl bg-white/10 px-6 py-4 text-left text-sm text-white/80 backdrop-blur-sm">`) migrates to `<FrostedCard variant="subdued" className="mx-auto mt-4 max-w-2xl text-left text-sm text-white/80">`. Add the FrostedCard import. Adjust internal padding ONLY if FrostedCard subdued's default padding visibly differs from the current `px-6 py-4` rendering — verify in browser before adding compensating classes. Internal heading and copy stay verbatim.

#### Change 8 — ListingShareDropdown light → dark theme

Modify `frontend/src/components/local-support/ListingShareDropdown.tsx`.

The dropdown panel (currently `absolute right-0 top-full z-10 mt-2 w-56 rounded-md bg-white py-2 border border-gray-200 shadow-lg`) migrates to `absolute right-0 top-full z-10 mt-2 w-56 rounded-xl bg-hero-mid/95 backdrop-blur-md border border-white/10 shadow-frosted-base py-2`. This matches the navbar dropdown convention and removes the last light-themed surface in the app.

**Item button class strings.** Currently `flex w-full items-center gap-2 px-4 py-2 text-sm text-text-dark hover:bg-gray-100`. Migrate to `flex w-full items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/[0.05]`.

**Item icon colors.**
- Copy / Mail / MessageSquare lucide icons: keep their existing size, change color from default to `text-white/60`.
- Facebook / X inline SVGs: keep brand colors AS-IS (brand identifiers — deliberate semantic exception).
- Check icon (rendered after copy success): `text-emerald-300` (replaces existing semantic green).

**Tests.** Assertions checking the `text-text-dark` class string on dropdown items will fail. Update to the new tokens. Snapshot tests on this component (if any) need re-baselining; verify the snapshot matches the dark-themed output before regenerating.

#### Change 9 — SearchStates retry button migration

Modify `frontend/src/components/local-support/SearchStates.tsx`.

The `<SearchError>` "Try Again" button (currently rolls-own white-pill) migrates to `<Button variant="subtle" size="md" onClick={onRetry}>Try Again</Button>`. The `<AlertCircle size={48} className="mb-4 text-danger">` above the message stays AS-IS — semantic error color, deliberate Tonal Icon Pattern exception per Decision 7.

#### Change 10 — ListingCard "Get Directions" link migration

Modify `frontend/src/components/local-support/ListingCard.tsx` inside the expanded details section.

The current rolls-own white-pill anchor migrates to subtle-variant styling. Per pre-execution recon step 6, the implementation depends on the Button component's API:

- **If Button supports `as="a"` or `asChild` (or polymorphic rendering):** use it. `<Button as="a" variant="subtle" size="md" href={directionsUrl} target="_blank" rel="noopener noreferrer">` (or the equivalent asChild pattern).
- **If Button does NOT support polymorphic rendering:** apply the subtle-variant class string manually to the anchor. The canonical class signature is:

  ```
  inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/[0.07] border border-white/[0.12] text-white px-6 py-2.5 backdrop-blur-sm hover:bg-white/[0.12] hover:shadow-subtle-button-hover hover:-translate-y-0.5 transition-colors duration-base motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30
  ```

  Verify the exact class signature against the shipped subtle Button variant during execution — if Spec 4A's subtle variant uses a slightly different token set, match it byte-for-byte.

The inline `<ExternalLink className="h-4 w-4" />` icon stays neutral (inherits anchor text color). Do NOT introduce a wrapper component to bridge the button-vs-anchor gap.

#### Change 11 — Tonal Icon Pattern application across listing-level icons

Apply per the icon table above. File-by-file:

- **11a — VisitButton** (`frontend/src/components/local-support/VisitButton.tsx`): when visited, MapPin migrates from `text-success` to `text-amber-300`. When unvisited, MapPin keeps `text-white/50` (preserved).
- **11b — Bookmark icon (in ListingCard)**: when bookmarked, migrate from `fill-success text-success` to `fill-emerald-300 text-emerald-300`. When unbookmarked, keep `text-white/50` (preserved).
- **11c — ListingCTAs** (`frontend/src/components/local-support/ListingCTAs.tsx`): each tile's icon gains its categorical color per the icon table. Read the file in execution to confirm the exact CTA configuration per category before applying — the brief lists three CTAs (Pray / Journal / Share to Prayer Wall) but the actual config may render variants. Apply tonal color inline; do not impose containers.
- **11d — StarRating**: no change. `fill-amber-400 text-amber-400` already correct per Decision 7.
- **11e — Address / phone / website / external-link icons in ListingCard**: target end state `text-white/50`. If already at this token, no change. If drifted (e.g., a stray `text-primary` on the website ExternalLink in expanded details), update.
- **11f — SearchPrompt MapPin (idle empty state)**: target end state `text-white/40` (or whatever `FeatureEmptyState` renders by default if unspecified). Verify in execution; update via `iconClassName` prop on FeatureEmptyState if drift.
- **11g — NoResults SearchX**: target end state `text-white/40`. Same verification pattern as 11f.
- **11h — SearchError AlertCircle**: stays `text-danger` (Decision 7 exception, preserved).

#### Change 12 — Saved-tab empty state migration

Modify `frontend/src/components/local-support/LocalSupportPage.tsx` at the saved-tab-empty section (~line 446).

The current rolls-own (`<div className="flex flex-col items-center py-12 text-center"><p className="text-base text-white/60">No saved {category} yet. Bookmark listings to see them here.</p></div>`) migrates to:

```tsx
<FeatureEmptyState
  icon={Bookmark}
  iconClassName="text-white/40"
  title={`Your saved ${categoryLabel}`}
  description="Bookmark places to find them again later."
/>
```

Add `import { Bookmark } from 'lucide-react'` if not already imported. Use the existing `categoryLabel` variable already used elsewhere in the shell (e.g., "churches" / "counselors" / "Celebrate Recovery groups" — verify exact form in execution and match it). The copy rewrite is per Decision 11 — less transactional, more declarative; the bookmark icon shown in the empty-state graphic teaches the affordance.

**Test impact.** Tests asserting the old copy ("No saved {category} yet. Bookmark listings to see them here.") need updating to the new strings. This is mechanical class/string update, separate from the 4 pre-existing failures fixed in Change 15.

#### Change 13 — `02-security.md` rule rewording

Modify `.claude/rules/02-security.md` at line 23 (the bullet listing "Local Support search, Local Support bookmarking" under "What requires login").

Current text: `- Local Support search, Local Support bookmarking`

Update to (matching the file's existing format and indentation): two bullets under a more accurate clarification — one stays under "What requires login" listing only `Local Support bookmarking, Local Support visit-recording`, the other is added under "What works without login" listing `Local Support search and results display (browsing churches, counselors, and Celebrate Recovery groups is intentionally public — anyone can find local support without an account)`. CC selects the precise wording during execution to match the file's voice; the locked content is the policy direction (search public, bookmark/visit-recording auth-gated), not the verbatim string. Verify the change does not contradict any other line in `02-security.md`.

#### Change 14 — `11-local-storage-keys.md` documentation addition

Modify `.claude/rules/11-local-storage-keys.md` (or `11b` if the keys index has been split).

Add the `wr_bookmarks_<category>` family per Decision 15. Match the file's existing formatting conventions (the doc uses table format with `Key`, `Type`, `Feature` columns under category headings — add three rows under an appropriate section, OR a single row referencing the variant family with the variants enumerated in the Feature column, matching whichever pattern the file already uses for similar key families):

- **Schema:** `string[]` of LocalSupportPlace IDs
- **Variants:** `wr_bookmarks_churches`, `wr_bookmarks_counselors`, `wr_bookmarks_celebrate-recovery`
- **Persistence:** only when user is authenticated (the bookmark action is auth-gated; logged-out users see the auth modal and bookmark state is never written)
- **Purpose:** client-side bookmark state for Local Support listings
- **Eviction:** none (manual user action only)
- **Consumed by:** `LocalSupportPage.tsx` (read on mount, write on bookmark toggle)

Verify per pre-execution recon step 7 that the keys are not already documented before adding. If a partial entry exists, reconcile.

#### Change 15 — Pre-existing test failure fixes (4 → 0)

The 4 baseline failures listed in CLAUDE.md as "logged-out mock listing cards in Local Support / Counselors / Celebrate Recovery / Churches" stem from rule/code drift: tests were written expecting search to be auth-gated, but the implementation has never gated search. Per Decision 12, open search is the correct product behavior.

Read each failing test, determine the precise drift mode:
- **(a) Test expects gated search and code is correct → update test to expect open search.** Most likely scenario per Decision 13 ("tests are wrong; code is correct").
- **(b) Test expects open search and code accidentally gates somewhere → fix code to match test.** Unlikely but verify before assuming (a).
- **(c) Some third interpretation surfaces during execution.** Surface to user before applying a non-(a) fix.

Apply test updates accordingly. After Change 15 lands, the 4 failures resolve, dropping the frontend regression baseline from 11 → 7. This MUST be reflected in the CLAUDE.md "Build Health" section — the bullet listing the 11 pre-existing failures gets the 4 Local Support entries removed (Change 16 of this spec, below).

#### Change 16 — CLAUDE.md baseline update

Modify `CLAUDE.md` "Build Health" section (the paragraph reading "Frontend regression baseline (post-Key-Protection): 8,811 pass / 11 pre-existing fail across 7 files. The 11 failures are documented tech debt...").

Update the count from `8,811 pass / 11 pre-existing fail across 7 files` to the post-Spec-5 actual count (likely `8,811 pass / 7 pre-existing fail across N files` — verify both numbers and file count after Change 15 lands). Update the enumerated list to remove the 4 Local Support entries and keep the remaining failures: orphan test for a deleted hook, CSS class drift in one plan browser test, Pray loading-text timing flake.

If the actual post-Change-15 baseline differs from "11 → 7" by any number (e.g., a new test added during the migration changes the count, or a fifth Local Support test failure surfaces unexpectedly), update CLAUDE.md to the actual count — do not force-fit the documented numbers.

### Non-Functional Requirements

- **Performance:** No regression on Local Support routes. BackgroundCanvas adds a small atmospheric layer cost — verify Lighthouse Performance stays at 90+ on `/local-support/churches` (the canonical Local Support route). Atmospheric tuning (Decision 1 authorization) is performance-neutral.
- **Accessibility (WCAG 2.2 AA):** Lighthouse Accessibility 95+ on all 3 routes after the migration. ALL existing ARIA wiring on tab bar, mobile view toggle, share dropdown, listing card actions, geolocation flow, and skip-link is preserved exactly. Keyboard navigation paths (tab order, Home/End/ArrowLeft/Right on tablist, Escape to close share dropdown if existing) work identically. Color contrast on all migrated tokens verified — particularly the bookmark `fill-emerald-300 text-emerald-300` against FrostedCard chrome, the VisitButton `text-amber-300` against the same chrome, and the violet tab-active `bg-violet-500/[0.13]` background contrast against `text-white`.
- **Animation tokens (BB-33):** Any new transition timing introduced by the migration (e.g., subtle Button hover lift transition) imports from `frontend/src/constants/animation.ts`. Do not hardcode `200ms`, `300ms`, or `cubic-bezier(...)` strings in any class string. The existing `transition-colors duration-base motion-reduce:transition-none` pattern is preserved on retained elements.
- **Reduced motion safety net:** The global `frontend/src/styles/animations.css` reduced-motion safety net continues to apply. Any new animation introduced by FrostedCard hover lift respects `motion-reduce:transition-none` and `motion-reduce:hover:translate-y-0`.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Visit any of `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` | Page renders; SearchPrompt shows | Page renders; SearchPrompt shows | n/a — public |
| Type city / use geolocation / click "Search" / adjust distance slider | Works freely (geolocation prompts browser permission, then searches via mock or live service per maps-readiness probe) | Works freely | n/a — public per Decision 12 |
| View results list / pan-zoom map / click "View Details" in marker popup / click "Get Directions" | Works freely (Get Directions opens external `google.com/maps/dir` link) | Works freely | n/a — public |
| Click bookmark icon on a listing card | Auth modal opens with message "Sign in to bookmark listings" — `wr_bookmarks_<category>` is NOT written | Toggles entry in `wr_bookmarks_<category>` localStorage; bookmark icon switches to `fill-emerald-300 text-emerald-300` (after Spec 5) | "Sign in to bookmark listings" |
| "I visited" button visibility | Hidden (`showVisitButton={isAuthenticated}` — controlled at ListingCard prop level, no auth modal needed) | Visible; clicking adds entry to `wr_local_visits`, fires `recordActivity('localVisit')`, shows toast "Visit recorded. That took courage. +10 faith points." MapPin icon switches to `text-amber-300` (after Spec 5) | n/a — affordance hidden |
| Saved tab visibility | Hidden (only "Search Results" tab renders when `!isAuthenticated`) | Visible with `(N)` count badge; switching to it shows bookmarked places or the new FeatureEmptyState (after Spec 5 Change 12) | n/a — affordance hidden |
| Click share button on a listing card | Dark dropdown opens (after Spec 5 Change 8); all share targets work freely (`navigator.share` web-share, copy-link, Facebook, X, Mail, SMS) | Same dark dropdown opens | n/a — share is public |
| Click any ListingCTA tile inside expanded card (Pray / Journal / Share to Prayer Wall) | Routes to `/daily?tab=pray`, `/daily?tab=journal`, or `/prayer-wall` — destination handles its own auth gate (Pray and Journal are auth-gated at the action level on DailyHub; Prayer Wall posting is auth-gated; reading Prayer Wall is public) | Routes identically | n/a at this surface — gates live downstream |

**Decision 12 reaffirmation.** Search and results display are intentionally public on Local Support. Forcing logged-out users to sign in to look up local churches/counselors/CR groups is hostile and contradicts Worship Room's positioning as a low-friction support resource. Especially for crisis-adjacent surfaces (Counselors, Celebrate Recovery), removing barriers to discovery is a moral imperative, not just a UX preference. The pre-existing test failures fixed in Change 15 codify this; the rule rewording in Change 13 documents it; the auth-gating table above governs implementation expectations.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single-column stack. SearchControls stack vertically (Use My Location button → city input → range slider → Search submit). Tab bar (Search Results / Saved) renders full-width via `flex w-full` on the new violet pattern wrapper. Mobile view toggle (List View / Map View) renders full-width above the active panel using the same violet pattern. Either ResultsList OR ResultsMap renders (never both) based on `mobileView` state. ListingCard photo + info row remains a flex row (photo at left, info column at right) but with reduced padding (`p-5` per `<FrostedCard variant="default" className="p-5 sm:p-6">`). Disclaimer banner (Counselors only) wraps to 2-3 lines but keeps its amber chrome. CelebrateRecovery `extraContent` FrostedCard subdued spans full width minus `mx-auto max-w-2xl` constraint at this breakpoint. ListingShareDropdown (after Change 8) opens flush right with `w-56`. |
| Tablet (640–1024px) | Same single-column desktop-light layout. Mobile view toggle still active (`lg:hidden`). SearchControls regain horizontal alignment (Use My Location + city input on one row, range slider on the next, Search submit aligned right). ListingCard padding upgrades to `sm:p-6`. CelebrateRecovery `extraContent` retains `max-w-2xl` centered. |
| Desktop (≥ 1024px) | Two-column side-by-side layout. Left column is the scrollable ResultsList (`max-h-[calc(100vh-12rem)] overflow-y-auto pr-2`). Right column is the sticky ResultsMap (`sticky top-24 h-[calc(100vh-12rem)] rounded-xl border border-white/10`). Mobile view toggle is hidden via `lg:hidden`. Tab bar renders centered (existing alignment). The new BackgroundCanvas atmosphere layer wraps both columns plus the hero. Selected-state ring (after Change 3) renders `ring-2 ring-violet-400/60` on whichever ListingCard the user clicked from the map. |

**Specific responsive notes (preserved from current implementation):**
- The 44×44 minimum touch target on bookmark, share, expand chevron, and VisitButton is preserved. The new subtle Button variants (Use My Location, Search, Try Again, Get Directions) maintain `min-h-[44px]`.
- The range slider mile markers (`[1, 25, 50, 75, 100]`) remain visible at all breakpoints below the slider track.
- ListingCTAs grid switches from 1-column on mobile to 2-column on `sm` and up — the column transition is preserved; only the icon colors change per Change 11c.
- The CelebrateRecovery `extraContent` `mx-auto mt-4 max-w-2xl` centering is preserved across all breakpoints; only the chrome migrates from inline div to FrostedCard subdued.
- Mobile (< 640px): the active panel between List View and Map View is single-pane only — the violet view-toggle pattern from Change 6 governs which renders. Map height is `h-[400px]` mobile; `lg:h-full` desktop.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content. The only free-text user input on the page is `<VisitNote>` (the optional textarea where a logged-in user records why they visited a place). VisitNote content is stored in `wr_local_visits` localStorage only when the user is authenticated, with a 300-character limit and debounced auto-save. It is not sent to any AI provider, not surfaced to other users, and not subject to crisis detection (it's a private journaling affordance, similar in privacy register to the existing Gratitude Journal). No new AI integration ships with this spec; no copy generated by AI is rendered.

The amber regulatory disclaimer on the Counselors page (preserved AS-IS per Decision 10) reinforces the AI safety stance for users who arrive at Local Support during a difficult moment: "Worship Room is not a substitute for professional mental health care." This disclaimer is a regulatory/safety boundary; preserving its amber-warning chrome is part of the AI safety posture, not an aesthetic choice.

## Auth & Persistence

- **Logged-out users:** Demo-mode zero-persistence rule applies. No backend writes, no localStorage writes for bookmarks (gated via auth modal — no entry in `wr_bookmarks_<category>` is ever written for unauthenticated users) or visits (gated via hidden affordance — no entry in `wr_local_visits`). Search input typed into the location field, the selected radius, the active tab, the active mobile view (List vs Map), and the expanded-card / share-open state all live in component state only and reset on navigation. Geolocation permission is granted by the browser, not Worship Room — coordinates are used in-memory for the geocode-to-coordinates flow and never persisted.
- **Logged-in users:** No new persistence introduced by this spec. Existing persistence preserved:
  - `wr_bookmarks_<category>` (variants: `wr_bookmarks_churches`, `wr_bookmarks_counselors`, `wr_bookmarks_celebrate-recovery`) — `string[]` of LocalSupportPlace IDs, written on bookmark toggle, no eviction. **Newly documented in `11-local-storage-keys.md` per Change 14.**
  - `wr_local_visits` — `LocalVisit[]` (max 500), per-listing visit records with optional VisitNote text, fired alongside `recordActivity('localVisit')`. Already documented in `11-local-storage-keys.md`.
- **localStorage usage:** No new keys introduced. Two existing key families consumed; one (`wr_bookmarks_<category>`) gets retroactive documentation. Behavior of all key reads/writes is preserved exactly — Change 11b (bookmark icon color migration `fill-success → fill-emerald-300`) is purely visual, not behavioral.
- **Route type:** Public (all 3 routes). No route-level auth gate. Action-level gates (bookmark, visit) preserved exactly per the auth-gating table above.

## Completion & Navigation

N/A — Local Support is not part of the Daily Hub tabbed completion experience. Navigation away from Local Support flows through three downstream surfaces:

- **ListingCTAs** (inside expanded ListingCard): "Pray for this" routes to `/daily?tab=pray`, "Journal about this" routes to `/daily?tab=journal`, "Share to Prayer Wall" routes to `/prayer-wall` (verify Decision 14 — `?template=cr-buddy` query parameter on the CR variant — preserved as harmless, surface follow-up if a clearer path emerges).
- **VisitButton** (logged-in only): clicking "I visited" fires `recordActivity('localVisit')` which credits faith points via `useFaithPoints`. The toast "Visit recorded. That took courage. +10 faith points." is the completion signal at the surface; downstream, faith points and streaks update on the Dashboard.
- **"Get Directions"** (inside expanded ListingCard): opens external `google.com/maps/dir` link in a new tab. No internal navigation.

None of these completion paths change in this spec — only the visual treatment of the affordances.

## Design Notes

- **BackgroundCanvas atmospheric layer.** Reuses the multi-bloom canvas from `frontend/src/components/homepage/BackgroundCanvas.tsx` (or wherever the Round 3 canonical lives — verify path during execution). Import path matches the path used by Spec 4A on Dashboard. Atmospheric tuning per Decision 1 is authorized for Local Support specifically.
- **FrostedCard variants.** Reuses the `default` and `subdued` variants documented in `09-design-system.md` § "FrostedCard Tier System". Default variant renders `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl` with dual box-shadow and hover elevation. Subdued variant is the quieter sibling for supporting content (CR `extraContent` mini-card). Both are already in production on Dashboard, BibleLanding, DailyHub.
- **Subtle Button variant.** Reuses the variant Spec 4A introduced and Spec 4C consumed extensively. Class signature matches whatever Spec 4A shipped — Change 5b and Change 10 verify the exact tokens during execution. The polymorphic-anchor question for "Get Directions" (Change 10) is resolved by reading the Button component API; do NOT introduce a new wrapper.
- **Violet tab/segmented-control pattern.** Reuses the canonical pattern from DailyHub. Class strings (active / inactive / outer wrapper) are restated verbatim in Change 6 for executor reference but are not new — they're the canonical strings DailyHub already ships.
- **Tonal Icon Pattern.** Reuses the pattern from Specs 4B and 4C. Icon table extends to Local Support's iconography per direction doc Decision 7 — restated above for executor reference. Card chrome stays in the violet/glass system; the icon is the only colored element; colors are muted/pastel.
- **FeatureEmptyState primitive.** Reuses the existing canonical empty-state primitive used by SearchPrompt and NoResults. The saved-tab empty state (Change 12) joins the same primitive for consistency; copy is rewritten per Decision 11 to be less transactional.
- **Disclaimer banner (Counselors page).** Preserved AS-IS as a deliberate regulatory exception (Decision 10). `rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-200` with `role="note"`. Different semantic purpose ("important — read this") deserves different chrome. Parallel to GrowthGarden's earth-tone exception on Dashboard.
- **Form input chrome (location text input, range slider, sort/filter selects).** Preserved AS-IS per Decision 8. The quieter "utility input" idiom (`bg-white/[0.06] border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20`) is correct for utility filtering — distinct from the violet-glow textarea pattern used in DailyHub Pray/Journal where the input register is emotional/expressive.
- **VisitNote textarea (deferred).** Currently uses the utility input idiom. Borderline case flagged by Decision 8 — visits are typically private logging, not the same emotional register as morning Pray/Journal sessions. If user feedback signals coldness, migrates to violet-glow in a follow-up. Out of scope for Spec 5.
- **ResultsMap (Leaflet) internals.** Out of scope. Tile layer (CARTO Dark Matter), marker bindings, popup styling, ErrorBoundary, MapFallback all preserved. Only the listing-selected ring color updates from `ring-primary` to `ring-violet-400/60` (Change 3 closing paragraph).
- **No new visual patterns introduced.** Per the spec brief: patterns this spec USES are all already shipped; patterns this spec MODIFIES = none; patterns this spec INTRODUCES = none. Therefore no `[UNVERIFIED]` flags need apply at the planning step.

## Out of Scope

- **Leaflet bundle size optimization** (`manualChunks` or dynamic-import refactor) — deferred follow-up; the recon flagged this as a known opportunity but Decision-doc § "What's NOT in scope for Spec 5" explicitly defers it.
- **ResultsMap visual redesign beyond the selected-state ring color update.** Tile layer, marker icons (rebound from `leaflet/dist/images/*` for Vite), popup styling, ErrorBoundary, MapFallback all stay as-is.
- **Auth gate restoration on search.** Decision 12 keeps search open and is final.
- **New atmospheric variants for HorizonGlow vs BackgroundCanvas experiments.** Decision 1 locks BackgroundCanvas.
- **Disclaimer primitive extraction** (e.g., `<Disclaimer>` shared component). Decision 10 keeps the Counselors disclaimer as a deliberate one-off; do not extract.
- **VisitNote textarea migration to violet-glow.** Decision 8 defers — borderline case to be revisited if user feedback signals coldness.
- **ListingCTAs deep-link wiring on the Prayer Wall side** (consuming the `?template=cr-buddy` query parameter that the CelebrateRecovery → Prayer Wall ListingCTA passes). Decision 14: keep parameter as harmless future-proofing; deep-link consumer is a separate spec.
- **Backend / API changes.** None.
- **OfflineMessage component redesign.** OfflineMessage is shared (`components/pwa/OfflineMessage.tsx`) and Local Support consumes the `variant="light"` prop. Out of scope for visual migration here.
- **Service files** (`services/local-support-service.ts`, `services/google-local-support-service.ts`, `services/mock-local-support-service.ts`, `services/local-visit-storage.ts`). Read-only for migration purposes.
- **Type files** (`types/local-support.ts`). Read-only.
- **Page wrappers** (`Churches.tsx`, `Counselors.tsx` — no visual code). Verification only — no changes expected. CelebrateRecovery.tsx is the one exception (Change 7).
- **FrostedCard, BackgroundCanvas, Button, FeatureEmptyState primitives.** Consumed only — no internal changes.
- **Performance audit / bundle size measurement.** The migration is class-string + chrome-replacement; no new heavy imports beyond FrostedCard which is already widely used. Bundle delta expected to be ~0. CC may run `frontend/scripts/measure-bundle.mjs` if anomaly suspected, but it is not a required gate.
- **WCAG manual audit beyond the Lighthouse acceptance criterion below.** Lighthouse Accessibility 95+ is the gate; full manual a11y audit is a separate cycle.

## Acceptance Criteria

### Behavioral preservation (non-negotiable)

- [ ] All existing tests on Local Support files pass post-migration (after Change 15 fixes the 4 pre-existing failures and after class-string assertions are updated to new tokens).
- [ ] Frontend regression baseline drops from **8,811 pass / 11 pre-existing fail** to **8,811 pass / 7 pre-existing fail** (or matches actual count if the migration adds tests). Any NEW failure is reconciled before the spec is considered complete.
- [ ] `pnpm build` succeeds with no new errors.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] Geolocation flow works identically (browser permission prompt, 10s timeout, error toast on denial).
- [ ] Debounced search (existing 500ms debounce) works identically.
- [ ] Tab bar keyboard navigation (Home / End / ArrowLeft / ArrowRight, Enter to activate, roving tabindex) works identically.
- [ ] Mobile view toggle `aria-pressed` semantics work identically.
- [ ] Sort / filter / load-more / filtered-empty / no-results / error / retry / pagination flows in `ResultsList` work identically.
- [ ] Bookmark toggle (logged-in) writes / reads `wr_bookmarks_<category>` correctly; bookmark gate (logged-out) opens auth modal with "Sign in to bookmark listings" message.
- [ ] Visit recording (logged-in only — affordance hidden when logged-out) writes to `wr_local_visits`, fires `recordActivity('localVisit')`, shows the existing toast.
- [ ] Share dropdown (after dark-theme migration) all six targets work: web-share fallback to copy, copy-to-clipboard with Check feedback, Facebook, X, Mail, SMS.
- [ ] Map ResultsMap pan/zoom, marker click, "View Details" popup link, and ErrorBoundary `MapFallback` (network failure) all work identically.

### Visual migration

- [ ] BackgroundCanvas wraps Hero + main content on all 3 routes (`/local-support/churches`, `/counselors`, `/celebrate-recovery`). Atmospheric blooms render visibly at desktop and mobile breakpoints.
- [ ] LocalSupportHero no longer renders `<GlowBackground variant="center">`. The gradient text headline (`style={GRADIENT_TEXT_STYLE}` on the `<h1>`) is preserved exactly — visual diff against pre-migration shows zero change to the headline itself.
- [ ] CelebrateRecovery `extraContent` "What is Celebrate Recovery?" mini-card renders as `<FrostedCard variant="subdued">`; the heading and copy inside stay verbatim.
- [ ] ListingCard renders as `<FrostedCard variant="default">`; FrostedCard hover lift works on `lg` breakpoint; the rolls-own `lg:hover:shadow-md lg:hover:shadow-black/20` is removed (no double hover treatment); selected-state ring renders `ring-2 ring-violet-400/60` (verified via map marker click + visual check).
- [ ] ListingSkeleton matches new ListingCard chrome (FrostedCard default `p-5 sm:p-6 motion-safe:animate-pulse` wrapper); loading-to-loaded transition feels continuous.
- [ ] All four white-pill CTAs migrated to subtle Button variant: Use My Location (with `text-sky-300` MapPin), Search (neutral white Search icon, Loader2 spin preserved when loading), Try Again (neutral white text), Get Directions (subtle-styled anchor — polymorphic Button if API supports, manual class string otherwise).
- [ ] Tab bar (Search Results / Saved (N)) uses the violet system tab pattern (active = `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`, inactive = `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`, outer wrapper = `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`).
- [ ] Mobile view toggle (List View / Map View) uses the same violet system tab pattern.
- [ ] All ARIA preserved on tabs and toggles: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, roving tabindex, Home / End / ArrowLeft / ArrowRight keyboard navigation on the tab bar; `aria-pressed` on mobile toggle buttons. Verified via existing test suite passing without modification to behavioral assertions (only class-string assertions allowed to change).
- [ ] ListingShareDropdown renders dark-themed: panel `bg-hero-mid/95 backdrop-blur-md border border-white/10 rounded-xl shadow-frosted-base py-2`; item rows `text-white/80 hover:text-white hover:bg-white/[0.05]`; Copy / Mail / MessageSquare icons `text-white/60`; Facebook / X SVGs preserve brand colors; Check feedback `text-emerald-300`. Light-theme tokens (`text-text-dark`, `bg-gray-100`, `border-gray-200`) are gone from this file.
- [ ] Tonal Icon Pattern applied per the icon table:
  - Bookmark active: `fill-emerald-300 text-emerald-300` (verified by toggling bookmark on a listing card and inspecting computed style).
  - VisitButton when visited: MapPin `text-amber-300` (verified by recording a visit and inspecting).
  - Use My Location: MapPin `text-sky-300` (verified).
  - ListingCTAs: Heart `text-pink-300`, BookOpen `text-sky-300`, MessageSquare `text-violet-300` (verified across all 3 categories' ListingCTA variants).
  - StarRating: `fill-amber-400 text-amber-400` preserved.
  - SearchError AlertCircle: `text-danger` preserved.
- [ ] Saved-tab empty state migrates to FeatureEmptyState with `icon={Bookmark}`, `iconClassName="text-white/40"`, `title="Your saved {categoryLabel}"`, `description="Bookmark places to find them again later."`. Old rolls-own div is gone.
- [ ] Disclaimer chrome on Counselors page UNCHANGED (`rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-200` with `role="note"`). Visual diff shows zero change to the disclaimer.

### Documentation

- [ ] `02-security.md` line 23 reworded so that "Local Support search" is removed from the "What requires login" list and explicitly listed under "What works without login" (or equivalent reworded clarification per the file's voice). The bullet listing auth-gated Local Support actions limits to bookmarking and visit-recording.
- [ ] `11-local-storage-keys.md` documents the `wr_bookmarks_<category>` key family with all three variants (`wr_bookmarks_churches`, `wr_bookmarks_counselors`, `wr_bookmarks_celebrate-recovery`), schema (`string[]` of LocalSupportPlace IDs), persistence (auth-gated), purpose, eviction (none), and consumer (`LocalSupportPage.tsx`).
- [ ] CLAUDE.md "Build Health" section reflects the new baseline (4 Local Support test failures removed from the enumerated list; total fail count updated).

### Visual diff acceptance (manual eyeball check)

- [ ] `/local-support/churches`: BackgroundCanvas atmosphere visible behind hero + main; listing cards have FrostedCard default chrome (matches Dashboard / BibleLanding cards); tab bar uses violet pattern; share dropdown is dark-themed; bookmark icon switches to emerald-300 on toggle.
- [ ] `/local-support/counselors`: Same as churches PLUS amber regulatory disclaimer banner preserved exactly above search controls.
- [ ] `/local-support/celebrate-recovery`: Same as churches PLUS "What is Celebrate Recovery?" mini-card renders as FrostedCard subdued (visually matches other Round 3 subdued cards on the app).
- [ ] Mobile view at 375px: List View / Map View toggle uses violet pattern; switching between renders the appropriate panel only (never both); ListingCard padding visibly tighter (`p-5` per FrostedCard className).
- [ ] Map functions correctly: markers click, popups appear, marker click selects a listing card with `ring-2 ring-violet-400/60` highlight; ErrorBoundary `MapFallback` ("Map unavailable right now") still renders on simulated network failure.
- [ ] Bookmark interaction across all 3 categories: emerald-300 fill when active, white/50 when not.
- [ ] Visit interaction (logged-in only): amber-300 MapPin when visited, white/50 when not.
- [ ] BackgroundCanvas atmosphere does not feel too active during a 5-minute counselor search session (per Decision 1 — tune opacity downward if it does, document the choice).
- [ ] Form input focus ring contrast verified after BackgroundCanvas lands. If `focus:ring-primary/20` reads muddy against the new atmospheric layer, fall back to `focus:ring-violet-400/30`.

### Regression checks (other surfaces)

- [ ] DailyHub (`/daily?tab=*`): unchanged. Tab pattern source surface; verify zero drift in DailyHub's own tab rendering after Local Support consumes the same pattern.
- [ ] Dashboard (`/`): unchanged. BackgroundCanvas, FrostedCard chrome, subtle Button, Tonal Icon Pattern were all introduced on Dashboard in 4A/4B/4C; verify no drift after Local Support consumes the same primitives.
- [ ] BibleLanding (`/bible`): unchanged.
- [ ] `/bible/plans`: unchanged.

### Performance & accessibility

- [ ] Lighthouse Accessibility 95+ on `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`.
- [ ] Lighthouse Performance 90+ on `/local-support/churches` (the canonical Local Support route).
- [ ] No new animation-token violations: any new transition timing imports from `frontend/src/constants/animation.ts` (BB-33 discipline).
- [ ] Reduced-motion safety net intact: `prefers-reduced-motion: reduce` users see no FrostedCard hover lift translate, no animated atmospheric blooms (the global `frontend/src/styles/animations.css` safety net continues to apply).
