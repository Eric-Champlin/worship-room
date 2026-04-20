# Implementation Plan: Local Support Facelift + Google Places API Integration

**Spec:** `_specs/local-support-facelift-google-places.md`
**Date:** 2026-04-20
**Branch:** `claude/feature/local-support-facelift-google-places`
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05, covers Churches/Counselors/CR atmospheric hero state pre-facelift)
**Recon Report:** N/A (no per-feature recon; design-system.md covers the relevant patterns)

---

## Architecture Context

**Relevant existing files and patterns:**

- `frontend/src/pages/Churches.tsx`, `Counselors.tsx`, `CelebrateRecovery.tsx` — thin wrappers (~25-45 lines each) that render `<LocalSupportPage config={...} />`. Each passes a `scriptWord` prop to be retired.
- `frontend/src/components/local-support/LocalSupportPage.tsx` — the shared page component. Hosts the `Navbar`, `LocalSupportHero`, `SearchControls`, results grid, `SiteFooter`, and the tab/view-toggle buttons that need white-pill treatment.
- `frontend/src/components/local-support/LocalSupportHero.tsx` — currently uses `ATMOSPHERIC_HERO_BG` radial gradient + `renderWithScriptAccent` + `font-serif italic text-white/60` subtitle. Will be rewrapped in `<GlowBackground variant="center">` with Inter white subtitle and no script accent.
- `frontend/src/components/local-support/SearchControls.tsx` — "Use My Location" and "Search" buttons at lines 131 and 165 use `bg-primary ... text-white`. Replace with canonical white-pill pattern.
- `frontend/src/components/local-support/ListingCard.tsx` — `text-primary` phone (line 120), `text-white/60` address (line 110), `hidden shrink-0 sm:block` photo wrapper (line 84), `bg-primary/10 text-primary` Get Directions chip (line 247). All targeted.
- `frontend/src/services/local-support-service.ts` — Factory that always returns the mock service. Will check `isGoogleMapsApiKeyConfigured()` and return the Google implementation when truthy.
- `frontend/src/services/mock-local-support-service.ts` — NOT modified. Remains the fallback when no API key is configured.
- `frontend/src/components/homepage/GlowBackground.tsx` — reused as-is. Exposes `variant: 'center' | 'left' | 'right' | 'split' | 'none'`, orbs rendered with `data-testid="glow-orb"`, `pointer-events-none`, `aria-hidden="true"`, `animate-glow-float` with `motion-reduce:animate-none`.
- `frontend/src/lib/env.ts` — `isGoogleMapsApiKeyConfigured()` and `requireGoogleMapsApiKey()` already exist. No changes needed.
- `frontend/src/types/local-support.ts` — `DENOMINATION_OPTIONS` and `SPECIALTY_OPTIONS` vocabularies used for inference.
- `frontend/src/constants/gradients.tsx` — `GRADIENT_TEXT_STYLE` + `renderWithScriptAccent` helpers. `renderWithScriptAccent` remains in use by `PageHero.tsx` for other pages; only its Local Support usage is retired.

**Directory conventions:**
- Local Support components live in `frontend/src/components/local-support/` with co-located `__tests__/` folder.
- Services live in `frontend/src/services/` with co-located `__tests__/` folder.
- New non-UI lib modules (mapper, cache) live under `services/` next to the Google service they feed, matching `mock-local-support-service.ts`'s location.

**Component/service patterns to follow:**
- `LocalSupportService` interface has two async methods: `search(params, page)` and `geocode(query)`. The Google implementation must conform exactly — `LocalSupportPage.tsx` handles the try/catch + `SearchError` UI and must not change.
- Text-match inference (denomination, specialty): ordered array of `[canonical, pattern]` tuples, scan lowercased haystack, return first match. Unmatched returns `null` (denomination) or `['General']` (specialties).
- Factory swap (`createLocalSupportService()`): check env key, return real-or-mock. Matches the `bb32-v1` AI cache factory pattern (conditional swap, mock fallback, zero-UI impact).

**Database tables involved:** None. This is a frontend-only facelift + API integration. No backend writes.

**Test patterns to match:**
- Existing component tests use `render()` + `screen.getByRole/getByText` from `@testing-library/react`. No provider wrapping needed for `LocalSupportHero` (it has no hooks consuming providers). `LocalSupportPage.test.tsx` uses its own provider stubs.
- New `google-places-mapper.test.ts` is a pure unit test — no React rendering needed, no providers. Pattern: `describe` block per exported function, `it` per test case.

**Auth gating patterns:**
- `LocalSupportPage.tsx` uses `useAuth()` and `useAuthModal()`. The `onInteractionBlocked` prop on `SearchControls` is set to `() => authModal.openAuthModal('Sign in to search local resources')` when `!isAuthenticated`. This wiring stays exactly as-is.
- The bookmark handler and the visit handler already route through `useAuthModal` when logged out. Unchanged.
- `ListingCard` "Get Directions" link is an external `target="_blank"` link — no gating needed (unchanged).

**Shared data models from master plan:** None applicable — this spec does not depend on the Forums Wave master plan.

**Cross-spec dependencies from master plan:** None — this is a standalone visual + data-wiring spec.

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan. This spec introduces ZERO new auth gates — existing behavior is preserved exactly.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Browse Local Support pages | No gate (full access) | Steps 6, 7, 8, 9 | N/A — visible to logged-out |
| Type in location input | No gate | Step 7 | N/A — controlled input |
| Click "Use My Location" | Existing auth modal when logged out | Step 7 | `onInteractionBlocked ?? handleUseMyLocation` — unchanged |
| Click "Search" submit | Existing auth modal when logged out | Step 7 | `onInteractionBlocked` handler on form — unchanged |
| Expand result card | No gate | Step 9 | N/A — card expand is visible to all |
| Click "Get Directions" | No gate (external link) | Step 9 | N/A — `<a target="_blank">` |
| Click "Visit Website" | No gate (external link) | Step 9 | N/A — unchanged |
| Click "I Visited" | Existing auth modal | Not touched | `VisitButton` internal auth check — unchanged |
| Click phone `tel:` link | No gate | Step 9 | N/A — `tel:` anchor |
| Switch Search Results / Saved tabs | No gate | Step 8 | N/A — tab switch is visible to all |
| Toggle bookmark | Existing auth modal | Not touched | `handleToggleBookmark` in LocalSupportPage — unchanged |

**Verification:** Step 10 tests assert the existing auth-modal wiring is preserved (logged-out click still triggers `onInteractionBlocked`). No changes to auth modal copy. No new auth gates introduced.

---

## Design System Values (for UI steps)

Values pulled from `_plans/recon/design-system.md` (captured 2026-04-05) + `.claude/rules/09-design-system.md` (White Pill CTA Patterns section) + `_plans/local-support-facelift-and-google-places.md` (master plan) + `frontend/src/components/homepage/GlowBackground.tsx` (live code).

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero wrapper | component | `<GlowBackground variant="center">` (no `glowOpacity` override) | GlowBackground.tsx:99-111, design-system.md § "Purple Glow Orb Gradients" |
| Glow orb 1 (center) | opacity | `0.25` | GlowBackground.tsx:13 |
| Glow orb 2 (center) | opacity | `0.18` | GlowBackground.tsx:19 |
| Glow orb — color | CSS | `radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)` | GlowBackground.tsx:88-90 |
| Glow orb — blur / anim | CSS | `blur-[60px] md:blur-[80px] animate-glow-float motion-reduce:animate-none will-change-transform pointer-events-none` | GlowBackground.tsx:75-76 |
| Glow orb — a11y | attrs | `aria-hidden="true"` | GlowBackground.tsx:92 |
| Hero `<h1>` | style | `style={GRADIENT_TEXT_STYLE}` (white-to-purple gradient `linear-gradient(223deg, rgb(255,255,255) 0%, rgb(139,92,246) 100%)` via `background-clip: text` + `text-transparent`) | design-system.md:76, LocalSupportHero.tsx:31 (preserved) |
| Hero `<h1>` | className | `mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2` | LocalSupportHero.tsx:30 (preserved) |
| Hero `<p>` subtitle | className | `mx-auto max-w-2xl text-base leading-relaxed text-white sm:text-lg` | Master plan §1.1 — drops `font-serif italic text-white/60` |
| Hero `<section>` | className | `relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40` | LocalSupportHero.tsx:25 (preserved) — `style={ATMOSPHERIC_HERO_BG}` removed |
| Primary CTA (Pattern 1, inline) | className | `rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50` | Master plan §1.4, spec §"Design Notes", 09-design-system.md § "White Pill CTA Patterns" |
| Active tab pill | className | `bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]` (applied inside `cn(...)` branch) | Master plan §1.5 |
| Active tab focus ring | className | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | Master plan §1.5 |
| Inactive tab pill | className | `bg-white/10 text-white/60 hover:bg-white/15` (unchanged) | LocalSupportPage.tsx:301 |
| Listing card photo wrapper | className | `shrink-0` (no longer `hidden ... sm:block`) | Master plan §1.7 |
| Listing card photo img | className | `h-16 w-16 rounded-lg object-cover sm:h-20 sm:w-20` | Master plan §1.7 |
| Listing card photo placeholder | className | `flex h-16 w-16 items-center justify-center rounded-lg bg-white/[0.06] sm:h-20 sm:w-20` | Master plan §1.7 |
| Listing card address `<p>` | className | `mt-1 flex items-center gap-1 text-sm text-white` | Master plan §1.6 |
| Listing card address MapPin icon | className | `shrink-0 text-white/70` (was `shrink-0`) | Master plan §1.6 |
| Listing card phone anchor | className | `rounded text-white hover:underline focus:outline-none focus:ring-2 focus:ring-primary-lt` | Master plan §1.6 |
| Get Directions CTA | className | `inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` | Master plan §1.6 |
| Primary color | token | `#6D28D9` (`text-primary`, `bg-primary`) → `rgb(109, 40, 217)` | design-system.md:55 |
| Primary Light | token | `#8B5CF6` (`ring-primary-lt`) → `rgb(139, 92, 246)` | design-system.md:56 |
| Hero BG | token | `#08051A` (`bg-hero-bg`) — body of GlowBackground wrapper | design-system.md:57 |
| Body font | token | `Inter` (`font-sans`) — inherited from body default | 09-design-system.md § "Typography" |

**No `[UNVERIFIED]` values in this plan.** All class strings are already in use elsewhere in the app (homepage white pill, GlowBackground on home sections) or are documented canonical patterns in `09-design-system.md`.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- **White pill (Pattern 1) for inline CTAs** (Use My Location, Search, active tab, mobile List/Map toggle, Get Directions): `rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50`. Do NOT use `rounded-lg` or `bg-primary text-white` — those are deprecated for primary actions on dark.
- **Get Directions pill uses smaller horizontal padding** (`px-4 py-2`, `text-sm`) than the generic Pattern 1 pill (`px-6 py-2.5`) — it sits inside an expanded card and must not overwhelm neighboring text. Keep `rounded-full`, `bg-white`, `text-primary`, `font-semibold`, and the glow halo.
- **GRADIENT_TEXT_STYLE on hero h1** — white-to-purple gradient via `background-clip: text`. The entire h1 string gets the gradient; do NOT wrap one word in `font-script` (the Caveat accent is a deprecated anti-pattern already retired from Grow and Music).
- **Hero subtitle is Inter, non-italic, full white.** Do NOT use `font-serif`, `italic`, or `text-white/60` on the subtitle. The Music Round 2 + Grow facelifts already established Inter-white as the post-Round-3 subtitle norm for inner pages.
- **GlowBackground orbs at default opacity (0.25 + 0.18)** — do NOT pass `glowOpacity={0.30}` on Local Support. The spec and master plan both specify default opacity. The 0.30 override is used by Daily Hub sections (now deprecated) and a few homepage consumers; Local Support sits on `bg-hero-bg` (via GlowBackground's own wrapper) and the defaults render visibly.
- **`GlowBackground` provides the background.** Remove `style={ATMOSPHERIC_HERO_BG}` from the `<section>` inside it — the wrapper's `bg-hero-bg` is the new base. Leave the `ATMOSPHERIC_HERO_BG` export in `PageHero.tsx` intact (Prayer Wall, Music, Bible, Ask, Grow still use it).
- **Orbs are `aria-hidden="true"` and `pointer-events-none`** (already baked into GlowBackground). No new ARIA wiring needed in the hero.
- **`renderWithScriptAccent` stays in `PageHero.tsx`** — only its Local Support usage is removed. Do NOT delete the helper itself; other pages use it.
- **Photo area visible at all breakpoints** — remove `hidden sm:block`, use responsive sizing `h-16 w-16 sm:h-20 sm:w-20`. Add `onError` handler that self-hides `<img>` elements when a Google Photo URL 403s.
- **Phone anchor: `text-white`, NOT `text-primary`.** Underline on hover preserved as affordance. Focus ring uses `ring-primary-lt`, not `ring-primary` (which was the pre-Round-3 focus color).
- **Address: `text-white`. MapPin icon before it: `text-white/70`** (slightly muted — icon is decoration, address is content).
- **Visit Website link stays `text-primary`** — it's a CTA anchor inside an already-hierarchical expanded panel, and the master plan explicitly keeps it purple (do NOT change it).
- **Google Places API key ships to the browser** — embed as query param on photo URLs and as `X-Goog-Api-Key` header on searches. Security is HTTP referrer + API restrictions in Google Cloud Console (operational, out of scope).
- **`X-Goog-FieldMask` header is mandatory** on every Places request — restricts response to used fields only. Without it, per-request billing triples.
- **10-second AbortController timeout** on all Google fetches. On timeout or non-2xx, throw `Error`; caller's existing try/catch in `LocalSupportPage.handleSearch` handles it.
- **Error states are unchanged** — existing `SearchError` / `OfflineMessage` / `SearchPrompt` / `NoResults` / `ListingSkeleton` handle all failure modes. Do NOT add new error UI.
- **No new localStorage keys.** `11-local-storage-keys.md` is NOT updated by this spec. Geocode cache and pagination-token cache are in-memory session scope only.
- **`mock-local-support-service.ts` is untouched.** It stays in the repo as the no-key fallback. Do NOT modify its data, logic, or export signature.
- **Leaflet + CARTO stays** — Google Places is data only. Do NOT touch `ResultsMap.tsx`.

**This block is displayed verbatim by `/execute-plan` Step 4d before each UI step to prevent drift.**

---

## Shared Data Models (from Master Plan)

No shared data models consumed. This spec produces one new TypeScript interface used only internally by the Google service:

```typescript
// frontend/src/services/google-places-mapper.ts
export interface GooglePlace {
  id: string
  displayName?: { text: string; languageCode?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  location: { latitude: number; longitude: number }
  rating?: number
  photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>
  editorialSummary?: { text: string; languageCode?: string }
  regularOpeningHours?: { weekdayDescriptions?: string[] }
  types?: string[]
  businessStatus?: 'BUSINESS_STATUS_UNSPECIFIED' | 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY'
}
```

`LocalSupportPlace`, `SearchParams`, `SearchResult`, `LocalSupportCategory`, `DENOMINATION_OPTIONS`, `SPECIALTY_OPTIONS` — all consumed from `frontend/src/types/local-support.ts` (existing, unchanged).

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| (none) | — | No new keys; no existing keys modified. Geocode cache is in-memory session-scoped `Map`. Pagination token cache is module-level in-memory `Map`. Both reset on page reload. |

`11-local-storage-keys.md` is NOT modified.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Hero `pt-32 pb-8`, h1 `text-3xl`, subtitle `text-base`. Glow orbs at 300×300px with `blur-[60px]` (canonical `GlowBackground` mobile sizes). Listing photo `64×64`. Mobile List/Map toggle visible below search controls. Search controls: "Use My Location" full-width above input; input + submit on their own row. Result cards stack photo-left / details-right (photo at 64×64). |
| Tablet | 768px | Hero `pt-36 pb-12`, h1 `text-4xl`, subtitle `text-lg`. Glow orbs at 600×600 / 450×450 with `blur-[80px]`. Listing photo `80×80`. Mobile List/Map toggle HIDDEN (`lg:hidden`); list + map render side-by-side starting at `lg` (1024px), but at 768px results show in single-column (both list and map stacked). Search controls: "Use My Location" inline with input + submit on single row (`sm:flex-row`). |
| Desktop | 1440px | Hero `pt-40 pb-12`, h1 `text-5xl`, subtitle `text-lg`. Glow orbs full size. Listing photo `80×80`. `lg:grid-cols-2` — list in left column (scrollable, `max-h-[calc(100vh-12rem)]`), map sticky in right column. |

**Custom breakpoints (from live layout):**
- Search controls form uses `sm:flex-row` (640px) — desktop layout from 640px up.
- Mobile List/Map toggle uses `lg:hidden` (<1024px) — toggle appears below 1024px, hides above.
- Listing photo uses `sm:` (640px) for the 64→80 size jump.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Search controls row (≥ 640px) | `Use My Location` button, location `<input>`, `Search` button | Same y ±5px at 1440px and 768px | Wrapping below 640px is EXPECTED (form uses `flex-col` → `sm:flex-row`) |
| Tab row (Search Results / Saved) | `Search Results` tab, `Saved (N)` tab | Same y ±5px at all breakpoints (1440, 768, 375) | No wrap — row is `flex gap-2` with 2 short-label children; total width well under 375px |
| Mobile List/Map toggle row (< 1024px only) | `List View` button, `Map View` button | Same y ±5px at 768px and 375px | No wrap — row is `flex gap-2` with 2 buttons |
| Listing card header row | place name `<h3>`, distance chip | Same y ±5px at all breakpoints | No wrap — `flex items-start justify-between`; chip is `shrink-0` |
| Listing card info row (photo left + details right) | photo div (64/80px), info block | Same y (top-aligned, `flex gap-4`) at all breakpoints | No wrap — photo is `shrink-0`, details use `min-w-0 flex-1` |
| Listing card actions row | bookmark, share, Visit buttons (left cluster) + expand chevron (right) | Same y ±5px at all breakpoints | No wrap — `justify-between` splits left/right |

This table is consumed by `/verify-with-playwright` Step 11 — the new white-pill treatment must not change row counts or wrapping behavior at any breakpoint.

---

## Vertical Rhythm

Expected spacing between adjacent sections. Values from `LocalSupportPage.tsx` live code, NOT modified by this spec:

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Navbar → Hero top | `pt-32` (128px mobile) / `pt-36` (144px tablet) / `pt-40` (160px desktop) | LocalSupportHero.tsx:25 (preserved) |
| Hero h1 → subtitle | `mb-3` on h1 (12px) + subtitle default flow | LocalSupportHero.tsx:30 (preserved) |
| Hero subtitle → extraContent (CR page only) | `mt-4` on extraContent wrapper | LocalSupportHero.tsx:38 (preserved) |
| Hero extraContent → action | `mt-6` on action wrapper | LocalSupportHero.tsx:39 (preserved) |
| Hero bottom padding | `pb-8` (32px mobile) / `pb-12` (48px tablet+) | LocalSupportHero.tsx:25 (preserved) |
| Hero → main content | `py-6 sm:py-8` on `<main>` (24px / 32px) | LocalSupportPage.tsx:249 (preserved) |
| Disclaimer → Search controls | `mb-6` on disclaimer (24px) | LocalSupportPage.tsx:255 (preserved) |
| Search controls → tabs | `mt-6 mb-6` on tabs row (24px top + 24px bottom) | LocalSupportPage.tsx:272 (preserved) |
| Tabs → results | No explicit gap; flows from tabs `mb-6` | LocalSupportPage.tsx:272 (preserved) |
| Listing card internal | `p-5 sm:p-6` padding, `mt-1` between text rows, `mt-4 pt-3` border-t actions separator | ListingCard.tsx:77, 110, 115, 134 (preserved) |
| Last section → footer | No explicit gap; `<main>` uses `flex-1` auto-fill | LocalSupportPage.tsx:249 (preserved) |

**Facelift does NOT change vertical rhythm.** Only swaps background (ATMOSPHERIC_HERO_BG → GlowBackground), text colors, pill shapes, and photo visibility — no padding, margin, or layout-size changes.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec file exists at `_specs/local-support-facelift-google-places.md`.
- [x] Master plan exists at `_plans/local-support-facelift-and-google-places.md` (detailed implementation source).
- [x] `VITE_GOOGLE_MAPS_API_KEY` is set in `frontend/.env.local` and documented in `.env.example` (per spec line 90 — "already set").
- [x] `requireGoogleMapsApiKey()` and `isGoogleMapsApiKeyConfigured()` accessors exist in `frontend/src/lib/env.ts` (verified).
- [x] `GlowBackground.tsx` is battle-tested on homepage sections and accepts `variant="center"` + optional `glowOpacity` (verified).
- [x] All auth-gated actions from the spec are accounted for in the plan (row-by-row match with spec table, all preserved as-is).
- [x] Design system values are verified (all class strings already used elsewhere or documented in `09-design-system.md`).
- [x] Zero `[UNVERIFIED]` values in this plan.
- [x] Recon report loaded (`design-system.md` — 2026-04-05 capture). Not stale: the facelift IS the reason the atmospheric hero is being replaced on these three pages, so the recon of the pre-facelift state is exactly what's needed as a before-reference.
- [x] Prior specs in the sequence are complete — Music Round 2 and Grow Detail facelifts are already merged (visible in `git log`).
- [x] No deprecated patterns used — no Caveat headings, no BackgroundSquiggle on these pages, no `animate-glow-pulse`, no cyan textarea borders, no italic Lora subtitles, no soft-shadow 8px-radius cards, no `PageTransition`.
- [x] No `@googlemaps/js-api-loader` dependency added. Implementation uses raw `fetch()` per spec line 119.
- [x] `mock-local-support-service.ts` is NOT modified (explicit spec requirement).
- [x] `ResultsMap.tsx` (Leaflet + CARTO) is NOT modified (explicit spec requirement).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Google Places v1 endpoint | `places:searchText` (not `places:searchNearby`) | Master plan §3.4 — `searchText` accepts the existing mock-compatible keyword ("church", "Christian counselor", "Celebrate Recovery") plus `locationBias` circle, avoiding a separate `includedPrimaryTypes` field map |
| Key exposure | Query param on photo URLs + `X-Goog-Api-Key` header on search/geocode | Master plan §3.4 — Google's documented pattern. Security is HTTP referrer + API restrictions in Cloud Console (out-of-code) |
| Dependency install | None (use native `fetch`) | Spec line 119 and master plan "Change summary" explicitly note `@googlemaps/js-api-loader` is not required when using raw fetch |
| Geocode cache | In-memory LRU, 50 entries, session-scoped, negative caching | Master plan §3.3 — prevents typo hammering, no localStorage (can change slowly; session boundary is fresh enough) |
| Pagination token cache | Module-level `Map<string, string\|null>` keyed by `${lat.toFixed(4)},${lng.toFixed(4)}:${radius}:${keyword}` | Master plan §3.4 — persists across Load More clicks within a page load |
| Next-page-token settle delay | Not implemented (premature optimization) | Master plan §3.4 — real UI clicks take longer than the 1-2s settle window |
| Denomination inference tie-break | "Church of Christ" before "Christ"-only patterns; "Non-denominational" matches both `non-denominational` and `nondenominational` | Master plan §3.2 — specific before general |
| Specialty inference cap | Max 3 matches per counselor | Master plan §3.2 — Google `editorialSummary` rarely mentions more cleanly |
| Counselor no-match fallback | `['General']` | Master plan §3.2 — empty array would hide the counselor from `'General'` filter view |
| Closed-permanently filter | Dropped in mapper (`return null`) | Master plan §3.2 — matches spec FR15 |
| Missing `displayName.text` or `location` | Dropped in mapper (`return null`) | Master plan §3.2 — we need name + coords to render a card |
| Photo `onError` behavior | Self-hide the `<img>` via `e.currentTarget.style.display = 'none'` | Master plan §1.7 — Google photos occasionally 403, but card layout must not break |
| Mock fallback on no-key | Return `createMockService()` unchanged | Spec FR9, FR20 — tests, CI, new dev setups need working demo mode |
| `scriptWord` prop fate | Remove from all three page configs; optionally remove from `LocalSupportPageConfig` + `LocalSupportHeroProps` interfaces | Master plan §1.2 — "preferred: remove it" — pruning avoids dead code |
| `renderWithScriptAccent` in `constants/gradients.tsx` | Keep as export | Master plan §1.2 — still used by `PageHero.tsx` for other pages |
| `ATMOSPHERIC_HERO_BG` export in `PageHero.tsx` | Keep as export | Master plan §1.3 — Prayer Wall / Music / Bible / Ask / Grow still use it |
| Glow orb opacity override | None (use GlowBackground defaults 0.25 + 0.18) | Master plan §1.3 — matches homepage, tests render against data-testid |
| Mobile List/Map toggle pill treatment | White-pill active state with shadow glow (variable is `mobileView`, not `activeTab`) | Master plan §1.5 — variable naming detail caught from live code |
| Visit Website link styling | Keep `text-primary` | Master plan §1.6 — anchor IS a CTA; expanded panel has enough hierarchy |

---

## Implementation Steps

### Step 1: Wire `createLocalSupportService()` to return Google service when key is configured

**Objective:** Flip the service factory to check the env key and return the real Google implementation. This step intentionally happens BEFORE the Google service is written so the factory is wired and covered by a type check; implementation of the Google service in Step 4 fills in the import target.

**Files to create/modify:**
- `frontend/src/services/local-support-service.ts` — modify factory function

**Details:**

Replace the file contents (12 lines → 30 lines):

```typescript
import type { SearchParams, SearchResult } from '@/types/local-support'
import { isGoogleMapsApiKeyConfigured } from '@/lib/env'
import { createMockService } from './mock-local-support-service'
import { createGoogleService } from './google-local-support-service'

export interface LocalSupportService {
  search(params: SearchParams, page: number): Promise<SearchResult>
  geocode(query: string): Promise<{ lat: number; lng: number } | null>
}

export function createLocalSupportService(): LocalSupportService {
  if (isGoogleMapsApiKeyConfigured()) {
    return createGoogleService()
  }
  return createMockService()
}
```

Keep `LocalSupportService` interface exports exactly as-is — `LocalSupportPage.tsx` imports types from here.

**The import `from './google-local-support-service'` resolves after Step 4.** If execution order is strict (Step 1 → Step 4), the intermediate commit will fail to build. Acceptable because `/execute-plan` executes all steps before marking done. If preferred, reorder so Step 4 executes before Step 1. Document the dependency in the Step Dependency Map below.

**Auth gating (if applicable):** N/A — no UI.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A: no UI.

**Guardrails (DO NOT):**
- Do NOT modify the `LocalSupportService` interface.
- Do NOT change the function name `createLocalSupportService()` — `LocalSupportPage.tsx:39` consumes it by name.
- Do NOT remove the mock import — it's the fallback branch.
- Do NOT add the Google service to an `if (process.env.NODE_ENV === 'production')` guard — the switch is key-configured, not env-configured. Tests run with no key and MUST get the mock.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Factory returns mock when no key | unit | Mock `isGoogleMapsApiKeyConfigured` → `false`, call factory, assert returned instance has mock-service-only markers (or is `instanceof` the mock class). Can piggyback on existing `local-support-service.test.ts` if it exists; otherwise add a minimal new test. |

**Expected state after completion:**
- [ ] `local-support-service.ts` returns the Google service when env key is truthy, mock service when absent.
- [ ] `LocalSupportPage.tsx` unchanged (still imports `createLocalSupportService` from the same path).
- [ ] TypeScript compiles after Step 4 completes (Step 4 creates the `google-local-support-service.ts` module).

---

### Step 2: Create `geocode-cache.ts` (in-memory LRU)

**Objective:** Session-scoped LRU cache for geocode results. Prevents repeat Geocoding API calls for the same lowercased-trimmed query string.

**Files to create/modify:**
- `frontend/src/services/geocode-cache.ts` — create new file

**Details:**

```typescript
interface CachedGeocode {
  coords: { lat: number; lng: number } | null
  timestamp: number
}

/**
 * In-memory LRU cache for geocode results. Keyed by lowercased trimmed query.
 * Max size: 50 entries. Evicts oldest on overflow. Negative results cached to
 * prevent typo hammering. Session-scoped — reset on page reload.
 */
class GeocodeCache {
  private cache = new Map<string, CachedGeocode>()
  private readonly MAX_SIZE = 50

  get(query: string): { lat: number; lng: number } | null | undefined {
    const key = this.keyFor(query)
    const entry = this.cache.get(key)
    if (!entry) return undefined
    // Refresh recency (LRU): delete + re-insert moves to end
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.coords
  }

  set(query: string, coords: { lat: number; lng: number } | null): void {
    const key = this.keyFor(query)
    if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) this.cache.delete(firstKey)
    }
    this.cache.set(key, { coords, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }

  private keyFor(query: string): string {
    return query.trim().toLowerCase()
  }
}

export const geocodeCache = new GeocodeCache()
```

**Return semantics:** `get()` returns `undefined` for cache miss, `null` for cached negative result, `{lat, lng}` for cached hit. Callers distinguish miss from negative by `=== undefined`.

**Auth gating (if applicable):** N/A — pure data module.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT persist to localStorage — spec §"Auth & Persistence" explicitly forbids it.
- Do NOT add TTL logic — session-boundary is the expiration mechanism.
- Do NOT export the `GeocodeCache` class — only the singleton `geocodeCache`.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Miss returns undefined | unit | `geocodeCache.get('unseen')` → `undefined` |
| Hit returns coords | unit | `set('x', {lat:1,lng:2})` → `get('x')` returns `{lat:1,lng:2}` |
| Negative cache returns null (not undefined) | unit | `set('x', null)` → `get('x')` returns `null`, but `get('y')` returns `undefined` |
| Case-insensitive key normalization | unit | `set('Nashville TN', coords)` → `get('nashville tn')` returns same coords |
| Trim whitespace on key | unit | `set('  Columbia  ', coords)` → `get('Columbia')` returns same coords |
| LRU eviction at 50 entries | unit | Insert 51 distinct queries; assert the first is gone, the newer 50 remain |
| LRU refresh on get | unit | Insert 50, `get(entry0)` to refresh, insert #51; entry0 survives, entry1 evicted |

**Expected state after completion:**
- [ ] `geocode-cache.ts` exports `geocodeCache` singleton with `get/set/clear` methods.
- [ ] 7 unit tests pass.
- [ ] No localStorage writes.

---

### Step 3: Create `google-places-mapper.ts` + unit tests

**Objective:** Pure data-transform module that converts Google Places v1 API responses into `LocalSupportPlace` objects. Includes the denomination + specialty text-match inference logic.

**Files to create/modify:**
- `frontend/src/services/google-places-mapper.ts` — create new file
- `frontend/src/services/__tests__/google-places-mapper.test.ts` — create new file

**Details:**

Module structure (from master plan §3.2):

```typescript
import type { LocalSupportPlace, LocalSupportCategory } from '@/types/local-support'
import { DENOMINATION_OPTIONS, SPECIALTY_OPTIONS } from '@/types/local-support'

export interface GooglePlace { /* ... see Shared Data Models section above ... */ }

export function buildPhotoUrl(photoName: string, apiKey: string, maxWidthPx = 400): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${encodeURIComponent(apiKey)}`
}

export function inferDenomination(name: string, description: string | null): string | null {
  const haystack = `${name} ${description ?? ''}`.toLowerCase()
  const patterns: Array<[string, string]> = [
    ['Church of Christ', 'church of christ'],
    ['Non-denominational', 'non-denominational'],
    ['Non-denominational', 'nondenominational'],
    ['Baptist', 'baptist'],
    ['Catholic', 'catholic'],
    ['Methodist', 'methodist'],
    ['Presbyterian', 'presbyterian'],
    ['Lutheran', 'lutheran'],
    ['Pentecostal', 'pentecostal'],
    ['Episcopal', 'episcopal'],
  ]
  for (const [canonical, pattern] of patterns) {
    if (haystack.includes(pattern)) {
      if ((DENOMINATION_OPTIONS as readonly string[]).includes(canonical)) {
        return canonical
      }
    }
  }
  return null
}

export function inferSpecialties(name: string, description: string | null): string[] | null {
  const haystack = `${name} ${description ?? ''}`.toLowerCase()
  const matches: string[] = []
  const patterns: Array<[string, RegExp]> = [
    ['Grief', /\b(grief|bereavement|loss)\b/],
    ['Anxiety', /\banxiet/],
    ['Depression', /\bdepress/],
    ['Addiction', /\b(addict|substance|recovery|sobriety)\b/],
    ['Marriage', /\b(marriag|couples?|marital)\b/],
    ['Trauma', /\btrauma\b/],
    ['Family', /\bfamil/],
  ]
  for (const [canonical, pattern] of patterns) {
    if (pattern.test(haystack)) {
      if ((SPECIALTY_OPTIONS as readonly string[]).includes(canonical)) {
        matches.push(canonical)
      }
    }
  }
  if (matches.length === 0) return ['General']
  return matches.slice(0, 3)
}

export function mapGooglePlaceToLocalSupport(
  gp: GooglePlace,
  category: LocalSupportCategory,
  apiKey: string,
): LocalSupportPlace | null {
  if (!gp.displayName?.text || !gp.location) return null
  if (gp.businessStatus === 'CLOSED_PERMANENTLY') return null

  const name = gp.displayName.text
  const description = gp.editorialSummary?.text ?? null
  const photoUrl = gp.photos?.[0]?.name
    ? buildPhotoUrl(gp.photos[0].name, apiKey)
    : null
  const denomination = category === 'churches' ? inferDenomination(name, description) : null
  const specialties = category === 'counselors' ? inferSpecialties(name, description) : null

  return {
    id: gp.id,
    name,
    address: gp.formattedAddress ?? 'Address unavailable',
    phone: gp.nationalPhoneNumber ?? gp.internationalPhoneNumber ?? null,
    website: gp.websiteUri ?? null,
    lat: gp.location.latitude,
    lng: gp.location.longitude,
    rating: gp.rating ?? null,
    photoUrl,
    description,
    hoursOfOperation: gp.regularOpeningHours?.weekdayDescriptions ?? null,
    category,
    denomination,
    specialties,
  }
}
```

**Test file structure** (from master plan §3.2 and spec "Tests" section):

```typescript
import { describe, it, expect } from 'vitest'
import {
  buildPhotoUrl,
  inferDenomination,
  inferSpecialties,
  mapGooglePlaceToLocalSupport,
  type GooglePlace,
} from '../google-places-mapper'

describe('buildPhotoUrl', () => {
  it('constructs the Places Photo media URL with the API key', () => { /* ... */ })
  it('encodes the API key as a query param', () => { /* ... */ })
  it('uses maxWidthPx=400 by default', () => { /* ... */ })
})

describe('inferDenomination', () => {
  it('matches First Baptist Church → Baptist', () => { /* ... */ })
  it('matches Catholic Church → Catholic', () => { /* ... */ })
  it('matches Methodist name', () => { /* ... */ })
  it('matches Presbyterian name', () => { /* ... */ })
  it('matches Lutheran name (does not misfire on Church of Christ pattern)', () => { /* ... */ })
  it('matches Church of Christ before generic "christ" patterns', () => { /* ... */ })
  it('matches Non-denominational (hyphenated)', () => { /* ... */ })
  it('matches nondenominational (no hyphen)', () => { /* ... */ })
  it('returns null for unmatched name', () => { /* ... */ })
  it('returns null for empty description', () => { /* ... */ })
  it('matches denomination found in description when name has none', () => { /* ... */ })
})

describe('inferSpecialties', () => {
  it('matches grief counseling → ["Grief"]', () => { /* ... */ })
  it('matches anxiety', () => { /* ... */ })
  it('matches depression', () => { /* ... */ })
  it('matches addiction and substance patterns', () => { /* ... */ })
  it('matches marriage / couples / marital', () => { /* ... */ })
  it('matches trauma', () => { /* ... */ })
  it('matches family', () => { /* ... */ })
  it('returns ["General"] for no specialty match', () => { /* ... */ })
  it('caps at 3 matches when multiple apply', () => { /* ... */ })
})

describe('mapGooglePlaceToLocalSupport', () => {
  const API_KEY = 'test-key'
  it('returns null for CLOSED_PERMANENTLY places', () => { /* ... */ })
  it('returns null for places missing displayName', () => { /* ... */ })
  it('returns null for places missing location', () => { /* ... */ })
  it('maps a happy-path church with photo + denomination inference', () => { /* ... */ })
  it('maps a happy-path counselor with specialty inference', () => { /* ... */ })
  it('maps celebrate-recovery without inference fields (both null)', () => { /* ... */ })
  it('falls back to "Address unavailable" when formattedAddress is missing', () => { /* ... */ })
  it('prefers nationalPhoneNumber over internationalPhoneNumber', () => { /* ... */ })
  it('falls back to internationalPhoneNumber when national is missing', () => { /* ... */ })
  it('sets phone to null when both are missing', () => { /* ... */ })
  it('sets photoUrl to null when photos array is empty or missing', () => { /* ... */ })
  it('passes through rating and hours when present, nulls them when absent', () => { /* ... */ })
})
```

**Auth gating (if applicable):** N/A — pure data module.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT use `dangerouslySetInnerHTML` anywhere — `editorialSummary` text flows to `description` and is rendered by React with default escaping (ListingCard uses `{place.description}` as plain text).
- Do NOT add theological judgment to the inference (e.g., "evangelical" tagging) — the vocabulary is frozen at `DENOMINATION_OPTIONS` in `types/local-support.ts`.
- Do NOT use `any` types — the `GooglePlace` interface captures exactly the fields we use; additional Google response fields are intentionally not typed.
- Do NOT import from `google-local-support-service.ts` (Step 4) — mapper must be service-agnostic.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| 3 buildPhotoUrl tests | unit | URL shape, key encoding, default width |
| 11 inferDenomination tests | unit | One per canonical denomination + unmatched + description-only |
| 9 inferSpecialties tests | unit | One per specialty + General fallback + 3-cap |
| 12 mapGooglePlaceToLocalSupport tests | unit | Filtering (3), happy paths (3), field defaults (5), phone preference (1) |

**Total: ~35 unit tests.** Aligns with "Medium" spec size calibration (10-20 tests) stretched to Large due to the combinatoric vocabulary.

**Expected state after completion:**
- [ ] `google-places-mapper.ts` exports `GooglePlace`, `buildPhotoUrl`, `inferDenomination`, `inferSpecialties`, `mapGooglePlaceToLocalSupport`.
- [ ] `__tests__/google-places-mapper.test.ts` has ~35 tests, all passing.
- [ ] No React imports, no localStorage imports.
- [ ] TypeScript compiles with `strict: true`.

---

### Step 4: Create `google-local-support-service.ts` (Google Places implementation)

**Objective:** Real Google Places API (v1) implementation of `LocalSupportService`. Handles search with `X-Goog-FieldMask`, pagination via `nextPageToken`, 10-second timeout, geocoding with cache integration.

**Files to create/modify:**
- `frontend/src/services/google-local-support-service.ts` — create new file

**Details:**

Module structure (from master plan §3.4):

```typescript
import type { SearchParams, SearchResult, LocalSupportCategory } from '@/types/local-support'
import type { LocalSupportService } from './local-support-service'
import { requireGoogleMapsApiKey } from '@/lib/env'
import { mapGooglePlaceToLocalSupport, type GooglePlace } from './google-places-mapper'
import { geocodeCache } from './geocode-cache'

const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

const REQUESTED_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.location',
  'places.rating',
  'places.photos',
  'places.editorialSummary',
  'places.regularOpeningHours',
  'places.types',
  'places.businessStatus',
].join(',')

// Module-level token cache keyed by (lat, lng, radius, keyword). Persists across
// calls within a page load so pagination doesn't re-issue the whole search.
const paginationTokens = new Map<string, string | null>()

function paramKey(params: SearchParams): string {
  return `${params.lat.toFixed(4)},${params.lng.toFixed(4)}:${params.radius}:${params.keyword}`
}

function categoryFromKeyword(keyword: string): LocalSupportCategory {
  const lower = keyword.toLowerCase()
  if (lower.includes('celebrate recovery')) return 'celebrate-recovery'
  if (lower.includes('counselor') || lower.includes('therapist')) return 'counselors'
  return 'churches'
}

function milesToMeters(miles: number): number {
  return miles * 1609.344
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

class GoogleLocalSupportService implements LocalSupportService {
  async search(params: SearchParams, page: number): Promise<SearchResult> {
    const apiKey = requireGoogleMapsApiKey()
    const category = categoryFromKeyword(params.keyword)
    const cacheKey = paramKey(params)

    let pageToken: string | null | undefined = undefined
    if (page > 0) {
      pageToken = paginationTokens.get(cacheKey)
      if (!pageToken) return { places: [], hasMore: false }
    }

    const body: Record<string, unknown> = {
      textQuery: params.keyword,
      locationBias: {
        circle: {
          center: { latitude: params.lat, longitude: params.lng },
          radius: milesToMeters(params.radius),
        },
      },
      maxResultCount: 20,
    }
    if (pageToken) body.pageToken = pageToken

    const response = await fetchWithTimeout(PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': `${REQUESTED_FIELDS},nextPageToken`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(no body)')
      throw new Error(`Places API error ${response.status}: ${errorText}`)
    }

    const data = await response.json() as { places?: GooglePlace[]; nextPageToken?: string }

    const places = (data.places ?? [])
      .map((gp) => mapGooglePlaceToLocalSupport(gp, category, apiKey))
      .filter((p): p is NonNullable<typeof p> => p !== null)

    paginationTokens.set(cacheKey, data.nextPageToken ?? null)

    return { places, hasMore: Boolean(data.nextPageToken) }
  }

  async geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    const cached = geocodeCache.get(query)
    if (cached !== undefined) return cached

    const apiKey = requireGoogleMapsApiKey()
    const url = `${GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`
    const response = await fetchWithTimeout(url, { method: 'GET' })

    if (!response.ok) {
      throw new Error(`Geocoding API error ${response.status}`)
    }

    const data = await response.json() as {
      status: string
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      geocodeCache.set(query, null)
      return null
    }

    const coords = data.results[0].geometry.location
    geocodeCache.set(query, coords)
    return coords
  }
}

export function createGoogleService(): LocalSupportService {
  return new GoogleLocalSupportService()
}
```

**Auth gating (if applicable):** N/A — pure service.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT import `@googlemaps/js-api-loader` — not needed when using raw `fetch()`. Do not add to `package.json`.
- Do NOT log the API key anywhere — per `lib/env.ts` policy ("Never log a key's value").
- Do NOT persist `paginationTokens` or `geocodeCache` to localStorage — session-scoped only.
- Do NOT catch errors inside the service and return fake success — throw so `LocalSupportPage.handleSearch` can show `SearchError`.
- Do NOT remove the `X-Goog-FieldMask` header — omitting it triples the billable cost per request.
- Do NOT wait for the `nextPageToken` settle delay (1-2s per Google docs). Real UI clicks naturally space beyond that; premature add-delay introduces latency for no benefit.
- Do NOT add a `searchNearby` fallback — spec and master plan both specify `searchText`.
- Do NOT add retry logic on 4xx errors — the caller handles via `SearchError` UI.

**Test specifications:**

Not heavily unit-tested because this module is a thin wrapper over `fetch` + mapper. Integration-tested manually per spec "Functional" acceptance criteria (live API calls). If unit tests are added, they would mock `global.fetch` — optional, not required by spec.

| Test | Type | Description |
|------|------|-------------|
| (optional) search happy path | unit | Mock `fetch` to return `{places:[...], nextPageToken:'abc'}`, assert mapped result + hasMore=true + token cached |
| (optional) search page > 0 without cached token | unit | Call `search(params, 1)` before `search(params, 0)` → returns `{places:[], hasMore:false}` without hitting network |
| (optional) search throws on 4xx | unit | Mock fetch to return 403 → expect `throws` with `Places API error 403` |
| (optional) geocode hits cache on repeat | unit | First call populates cache, second call with same query does NOT fetch |
| (optional) geocode caches negative results | unit | Mock `status: 'ZERO_RESULTS'` → returns null, caches null; second call returns null without fetch |

**Expected state after completion:**
- [ ] `google-local-support-service.ts` exports `createGoogleService()`.
- [ ] Module imports resolve (`geocodeCache`, `mapGooglePlaceToLocalSupport`, `requireGoogleMapsApiKey`).
- [ ] Step 1 factory wiring now type-checks cleanly.
- [ ] Manual verification (per spec Functional acceptance): real API call produces real results when `VITE_GOOGLE_MAPS_API_KEY` is set.

---

### Step 5: Remove `scriptWord` from the three page configs

**Objective:** Retire the Caveat-font accent on all three Local Support heroes. Three-file coordinated edit; no consumer of the `scriptWord` prop remains after this step.

**Files to create/modify:**
- `frontend/src/pages/Churches.tsx` — remove `scriptWord: 'Church'`
- `frontend/src/pages/Counselors.tsx` — remove `scriptWord: 'Counselor'`
- `frontend/src/pages/CelebrateRecovery.tsx` — remove `scriptWord: 'Recovery'`

**Details:**

For each file, delete the single `scriptWord: '...'` line from the config object. Leave every other line intact. No other changes to these three files.

**Churches.tsx:24** — delete line `scriptWord: 'Church',`
**Counselors.tsx:24** — delete line `scriptWord: 'Counselor',`
**CelebrateRecovery.tsx:23** — delete line `scriptWord: 'Recovery',`

**After Step 6 retires the prop from the `LocalSupportPageConfig` interface, these files are automatically valid.** The prop is marked optional (`scriptWord?: string`) in the current interface, so these edits can ship before Step 6 without a type error.

**Auth gating:** N/A — config-only change.

**Responsive behavior (UI steps only):**
- Desktop (1440px): Hero h1 on all three pages renders entirely in gradient Inter `text-5xl`. No `.font-script` descendants.
- Tablet (768px): Same treatment at `text-4xl`.
- Mobile (375px): Same treatment at `text-3xl`.

**Inline position expectations:** N/A — single h1.

**Guardrails (DO NOT):**
- Do NOT remove other config properties (title, subtitle, searchKeyword, filterOptions, filterLabel, disclaimer, extraHeroContent, category, headingId).
- Do NOT rename the title strings — they stay "Find a Church Near You", "Find a Christian Counselor", "Find Celebrate Recovery".
- Do NOT delete or modify the `SEO` / `breadcrumbs` / `jsonLd` wiring.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Churches config no longer contains scriptWord | unit (implicit) | Covered by Step 10's LocalSupportHero test update ("no font-script descendants") |

No new tests for this step — assertion is made in Step 10.

**Expected state after completion:**
- [ ] Three page config objects have no `scriptWord` key.
- [ ] Build passes (TypeScript allows optional prop omission).
- [ ] No `.font-script` appears in rendered h1 on any Local Support route.

---

### Step 6: Update `LocalSupportHero.tsx` — wrap in GlowBackground, Inter white subtitle, drop scriptWord

**Objective:** Rewrite the hero component to use `<GlowBackground variant="center">`, render the subtitle in Inter non-italic solid white, and stop using `renderWithScriptAccent`. Also prune the `scriptWord` prop from `LocalSupportHeroProps` and from the `LocalSupportPageConfig` interface in `LocalSupportPage.tsx` (Step 8 touches that file anyway).

**Files to create/modify:**
- `frontend/src/components/local-support/LocalSupportHero.tsx` — rewrite
- `frontend/src/components/local-support/LocalSupportPage.tsx` — remove `scriptWord` from config interface + hero call site (will be done atomically with Step 8, but pre-check)

**Details:**

Full replacement for `LocalSupportHero.tsx` (40 lines → 32 lines):

```tsx
import type { ReactNode } from 'react'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

interface LocalSupportHeroProps {
  headingId: string
  title: string
  subtitle: string
  extraContent?: ReactNode
  action?: ReactNode
}

export function LocalSupportHero({
  headingId,
  title,
  subtitle,
  extraContent,
  action,
}: LocalSupportHeroProps) {
  return (
    <GlowBackground variant="center">
      <section
        aria-labelledby={headingId}
        className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      >
        <h1
          id={headingId}
          className="mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
          style={GRADIENT_TEXT_STYLE}
        >
          {title}
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-white sm:text-lg">
          {subtitle}
        </p>
        {extraContent && <div className="mt-4">{extraContent}</div>}
        {action && <div className="mt-6">{action}</div>}
      </section>
    </GlowBackground>
  )
}
```

**Changes summarized:**
- Removed imports: `ATMOSPHERIC_HERO_BG` (from PageHero), `renderWithScriptAccent` (from gradients).
- Added import: `GlowBackground` (from homepage).
- `scriptWord?: string` prop removed from `LocalSupportHeroProps` interface.
- `scriptWord` removed from destructured props.
- `<section>` `style={ATMOSPHERIC_HERO_BG}` REMOVED — GlowBackground's `bg-hero-bg` is the new base.
- `<section>` is now the `{children}` of `<GlowBackground variant="center">`.
- h1 `{renderWithScriptAccent(title, scriptWord)}` → `{title}`.
- Subtitle `font-serif italic ... text-white/60` → `text-white`.

Additionally, `LocalSupportPage.tsx` line 27 (interface `LocalSupportPageConfig`) — remove `scriptWord?: string` property. Line 245 — remove `scriptWord={config.scriptWord}` from the `<LocalSupportHero>` call site. This edit is atomic with Step 8 (same file touched for tab + toggle changes).

**Auth gating:** N/A — visible to all users.

**Responsive behavior:**
- Desktop (1440px): h1 `text-5xl`, subtitle `text-lg`, hero `pt-40 pb-12`. Two glow orbs: large center at 600×600 (top-30%, left-50%, `translate-x-[-50%]`), secondary at 450×450 (top-60%, left-80%). Both blurred at `blur-[80px]`, animating via `animate-glow-float`.
- Tablet (768px): h1 `text-4xl`, subtitle `text-lg`, hero `pt-36 pb-12`. Orbs scale to same desktop sizes (md breakpoint triggers `md:w-[600px]` etc.).
- Mobile (375px): h1 `text-3xl`, subtitle `text-base`, hero `pt-32 pb-8`. Orbs at mobile sizes 300×300 / 250×250 with `blur-[60px]`.

**Inline position expectations:** N/A — hero content is stacked vertically (h1 → subtitle → optional extraContent → optional action).

**Guardrails (DO NOT):**
- Do NOT remove the `aria-labelledby={headingId}` on the `<section>` — screen readers rely on it.
- Do NOT wrap `{title}` in a `<span>` or apply any class that undoes `GRADIENT_TEXT_STYLE`.
- Do NOT pass `glowOpacity={0.30}` — default (0.25 + 0.18) is specified.
- Do NOT keep the `ATMOSPHERIC_HERO_BG` `style` on the section — that would double-stack a radial gradient on top of the GlowBackground and darken the orbs.
- Do NOT add `backdrop-blur` to the section — the orbs are meant to glow visibly behind content.
- Do NOT change the `<h1>` className list — font sizes, leading, padding preserved exactly.
- Do NOT delete `renderWithScriptAccent` from `constants/gradients.tsx` — PageHero still uses it.
- Do NOT delete `ATMOSPHERIC_HERO_BG` from `PageHero.tsx` — other inner pages still use it.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Renders GlowBackground ancestor | unit | `render(<LocalSupportHero ... />)` → `container.querySelector('[data-testid="glow-orb"]')` is not null (GlowBackground injects orbs with this test-id) |
| Renders two glow orbs | unit | `container.querySelectorAll('[data-testid="glow-orb"]').length === 2` |
| Subtitle has no font-serif or italic | unit | `screen.getByText(subtitle).className` — assert does NOT contain `font-serif`, `italic`, `text-white/60`. Asserts IS `text-white` |
| h1 has no font-script descendants | unit | `heading.querySelector('.font-script') === null` |
| h1 has GRADIENT_TEXT_STYLE applied | unit | `heading.getAttribute('style')?.includes('background-clip')` or assert `style` object matches GRADIENT_TEXT_STYLE tokens |
| Existing heading + subtitle render tests continue to pass | unit | Unchanged assertions from lines 6-27 of current LocalSupportHero.test.tsx |
| Existing extraContent / action render tests pass | unit | Unchanged assertions from lines 30-45 |
| `scriptWord` prop test REMOVED | unit | Delete the test at LocalSupportHero.test.tsx:84-98 (was asserting font-script span existed with scriptWord); replace with opposite assertion (no font-script descendants) |

**Expected state after completion:**
- [ ] `LocalSupportHero.tsx` renders two `data-testid="glow-orb"` elements as ancestors of the `<section>`.
- [ ] h1 contains zero `.font-script` descendants for any input `title`.
- [ ] Subtitle has `text-white` (computed `rgb(255, 255, 255)`), non-italic, Inter.
- [ ] `scriptWord` prop is gone from the component interface and the page config interface.
- [ ] Existing tests updated (see Step 10); component renders without regressions.

---

### Step 7: Update `SearchControls.tsx` buttons to white pill

**Objective:** Invert "Use My Location" (line ~131) and "Search" (line ~165) buttons from `bg-primary text-white` to the canonical white-pill Pattern 1. Preserve auth-modal wiring via `onInteractionBlocked ?? handleUseMyLocation`.

**Files to create/modify:**
- `frontend/src/components/local-support/SearchControls.tsx` — modify 2 className strings

**Details:**

**"Use My Location" button, line 131:**

```tsx
// Before
className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-lt disabled:opacity-50"

// After
className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50"
```

**"Search" submit button, line 165:**

```tsx
// Before
className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-lt disabled:opacity-50"

// After
className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50"
```

**No behavior changes.** `onClick={onInteractionBlocked ?? handleUseMyLocation}` and `disabled`, `aria-label`, icon children, and conditional text spans all preserved exactly. Loader2 icon (shown when `isGeolocating`) inherits `text-primary` via the button's text color (text-primary foreground on white bg → loader is purple on white).

**Auth gating:**
- `onInteractionBlocked` prop stays wired (line 128 + 125). When user is logged out, LocalSupportPage passes `onInteractionBlocked={() => authModal.openAuthModal('Sign in to search local resources')}`. Clicking either button in logged-out state triggers the existing modal with unchanged copy.
- Location input `readOnly={!!onInteractionBlocked}` + onClick guards preserved.

**Responsive behavior:**
- Desktop (1440px): Row layout (`sm:flex-row`). Use My Location shows text "Use My Location" (via `sm:hidden lg:inline`) at `lg` breakpoint. Search button shows "Search" text at `sm` breakpoint. Both render as pills with visible white glow halo.
- Tablet (768px): Row layout. Use My Location shows "My Location" text (via `hidden sm:inline lg:hidden`). Search button text visible.
- Mobile (375px): Column layout (`flex-col`). Use My Location button full-width above input, shows "Use My Location" text (via `sm:hidden lg:inline` — both sides of the conditional pull it back at mobile). Search button inline with input.

**Inline position expectations:**
- At 1440px and 768px: `Use My Location` button, location input (within flex-1 wrapper), and `Search` button all share same y-coordinate (±5px) in a single row. Form has `sm:flex-row sm:items-end`.
- At 375px: Form is `flex-col gap-3`. Use My Location is row 1, location input + Search are row 2 (inside their own `flex flex-1 gap-2` div). Wrapping IS expected below `sm` (640px).

**Guardrails (DO NOT):**
- Do NOT change `rounded-full` back to `rounded-lg` — this is the white-pill pattern.
- Do NOT change `font-semibold` back to `font-medium` — semibold is the white-on-dark readability requirement.
- Do NOT change `text-primary` → `text-primary-lt` on the text color — primary is the CTA foreground per design system.
- Do NOT change `px-6` back to `px-4` — wider padding is pill-canonical.
- Do NOT remove the `shadow-[0_0_20px_rgba(255,255,255,0.15)]` — it's what gives the inverted pill visual weight on dark.
- Do NOT remove `focus-visible:ring-offset-hero-bg` — it's part of the canonical accessible focus ring on `hero-bg` backgrounds.
- Do NOT touch the `onInteractionBlocked ?? handleUseMyLocation` pattern — auth-modal wiring.
- Do NOT touch the form's `flex flex-col gap-3 sm:flex-row sm:items-end` classes — that's the responsive row behavior.
- Do NOT change the location input's class string — still `rounded-lg`, still `bg-white/[0.06]`. The input is not a CTA; only buttons get the pill treatment.
- Do NOT change the radius slider's styling — unrelated to the facelift.
- Do NOT remove the `OfflineMessage` guard at top of `return`.
- Do NOT change any `aria-*` attribute.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Use My Location button has bg-white + text-primary | unit | `screen.getByRole('button', { name: 'Use my current location' }).className` contains `bg-white`, `text-primary`, `rounded-full`, `shadow-` (partial match) |
| Search button has bg-white + text-primary | unit | Same assertions for submit button |
| Focus-visible classes present | unit | className contains `focus-visible:ring-primary-lt` and `focus-visible:ring-offset-hero-bg` |
| onInteractionBlocked still fires on click when set | integration (existing test updated) | Logged-out simulation: click Use My Location → `onInteractionBlocked` callback invoked once |
| Disabled state preserves opacity-50 | unit | Render with `isLoading={true}` or `!locationInput.trim()` → button is `disabled`, className contains `disabled:opacity-50` |

**Expected state after completion:**
- [ ] Both buttons render as pills with `bg-white`, `text-primary`, `rounded-full`, glow halo.
- [ ] Hover darkens to `bg-gray-100` slightly.
- [ ] Disabled state applies 50% opacity.
- [ ] Auth modal wiring unchanged.
- [ ] All existing SearchControls tests updated to new className assertions.

---

### Step 8: Update `LocalSupportPage.tsx` — white pill tabs + mobile List/Map toggle + drop scriptWord

**Objective:** Invert active-state for Search Results / Saved tabs and mobile List View / Map View buttons to the white-pill treatment. Also prune `scriptWord` from `LocalSupportPageConfig` and from the `<LocalSupportHero>` call site.

**Files to create/modify:**
- `frontend/src/components/local-support/LocalSupportPage.tsx` — modify tab className (~line 297), mobile toggle classNames (~lines 376, 390), remove `scriptWord` from config interface (line 27) and hero call site (line 245)

**Details:**

**Config interface (line 22-33):** Remove `scriptWord?: string` line. Interface becomes:

```ts
export interface LocalSupportPageConfig {
  category: LocalSupportCategory
  headingId: string
  title: string
  subtitle: string
  extraHeroContent?: ReactNode
  searchKeyword: string
  filterOptions: readonly string[] | null
  filterLabel: string | null
  disclaimer?: string
}
```

**Hero call site (line 241-247):** Remove `scriptWord={config.scriptWord}` line. Becomes:

```tsx
<LocalSupportHero
  headingId={config.headingId}
  title={config.title}
  subtitle={config.subtitle}
  extraContent={config.extraHeroContent}
/>
```

**Tab pill className (line 297-302):**

```tsx
// Before
className={cn(
  'min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors',
  activeTab === tab
    ? 'bg-primary/20 text-white'
    : 'bg-white/10 text-white/60 hover:bg-white/15',
)}

// After
className={cn(
  'min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-base motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
  activeTab === tab
    ? 'bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]'
    : 'bg-white/10 text-white/60 hover:bg-white/15',
)}
```

**Mobile List View button (line ~372-385):**

```tsx
// Before — className
'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
mobileView === 'list'
  ? 'bg-primary/20 text-white'
  : 'bg-white/10 text-white/60 hover:bg-white/15',

// After — className
'inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-base motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
mobileView === 'list'
  ? 'bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]'
  : 'bg-white/10 text-white/60 hover:bg-white/15',
```

**Mobile Map View button (line ~386-399):** Same treatment as List View, keyed on `mobileView === 'map'` instead of `'list'`.

**Notes:**
- `rounded-lg` → `rounded-full` on mobile toggle for consistency with the Search Results / Saved tabs and the rest of the site's pill pattern.
- `font-medium` → `font-semibold` on both active+inactive for consistency (the inactive muted-ghost state uses `text-white/60` which reads fine with semibold).
- Active state gains `shadow-[0_0_20px_rgba(255,255,255,0.15)]` and `active:scale-[0.98]`.
- Focus ring is added to the BASE className (applies to both active + inactive) so keyboard focus is always visible.
- Inactive state classNames preserved as-is — muted ghost is the whole affordance contrast.

**Auth gating:** N/A — tab and toggle switches are visible to all users. No auth gates on these controls.

**Responsive behavior:**
- Desktop (1440px): Tabs row visible, List/Map toggle HIDDEN (`lg:hidden`). Active tab renders white-pill.
- Tablet (768px): Tabs row visible. List/Map toggle visible (below `lg`). Both use white-pill active treatment.
- Mobile (375px): Same as tablet. Tab labels short enough to fit in-row without wrapping.

**Inline position expectations:**
- Tab row (1440, 768, 375): `Search Results` + `Saved (N)` share same y ±5px. No wrap (2 short labels with gap-2, <200px total).
- Mobile toggle row (768, 375): `List View` + `Map View` share same y ±5px. No wrap (2 short labels with gap-2 and List/Map icons).

**Guardrails (DO NOT):**
- Do NOT remove the `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls` / keyboard-nav (`ArrowRight`, `Home`, `End`) attributes on the tab buttons — accessibility-critical.
- Do NOT remove the `aria-pressed={mobileView === 'list'}` / `aria-pressed={mobileView === 'map'}` attributes on the mobile toggle buttons.
- Do NOT unify the tab role as `button` — the WAI-ARIA `tab` pattern is in use here.
- Do NOT change `tabIndex={activeTab === tab ? 0 : -1}` — roving tabindex is the accessible tablist pattern.
- Do NOT remove the `ref={(el) => { tabRefs.current[index] = el }}` wiring — arrow-key nav depends on it.
- Do NOT change the `onKeyDown` handler — it implements Home/End/ArrowLeft/ArrowRight tab nav.
- Do NOT modify any other part of LocalSupportPage.tsx — only the specified lines.
- Do NOT touch the `handleSearch`, `handleGeocode`, `handleLoadMore`, `handleToggleBookmark`, `handleVisit`, `handleRetry`, `bookmarkedIds`, or `savedPlaces` logic — facelift-only spec.
- Do NOT touch the `<Navbar transparent />` or `<SiteFooter />` placements.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Active Search Results tab has bg-white + text-primary | unit | In LocalSupportPage.test.tsx: render with activeTab=search, find tab by role, assert className contains `bg-white`, `text-primary`, `shadow-` |
| Inactive Saved tab has bg-white/10 + text-white/60 | unit | Same test, assert inactive tab className contains `bg-white/10`, `text-white/60` |
| Mobile List View active state has white pill | unit | Render with mobileView=list (may need to set state via fireEvent on mobile toggle), assert list button className contains `bg-white`, `text-primary` |
| Mobile Map View active state has white pill | unit | Same test flipped |
| scriptWord prop no longer passed to hero | unit | Assert `<LocalSupportHero>` call site does not include scriptWord (covered by type check; may be implicit) |

**Expected state after completion:**
- [ ] Active Search Results / Saved tab renders as white pill.
- [ ] Mobile List View / Map View buttons render as white pills when active.
- [ ] Inactive tabs remain muted-ghost.
- [ ] `scriptWord` is gone from the config interface and hero call site.
- [ ] TypeScript compiles without `scriptWord` anywhere.
- [ ] All existing tab keyboard-nav tests continue to pass.

---

### Step 9: Update `ListingCard.tsx` — white phone/address, photo visible all breakpoints, Get Directions white pill

**Objective:** Apply the remaining visual fixes to the listing card: white phone anchor with hover underline + `ring-primary-lt`, white address + muted MapPin icon, photo visible at all breakpoints with responsive sizing + onError fallback, Get Directions CTA upgraded from `bg-primary/10 text-primary` chip to canonical white pill.

**Files to create/modify:**
- `frontend/src/components/local-support/ListingCard.tsx` — modify photo block (~82-97), address paragraph (~110-113), phone anchor (~115-125), Get Directions anchor (~243-251)

**Details:**

**Photo block (lines ~82-97):** Replace

```tsx
<div className="hidden shrink-0 sm:block">
  {place.photoUrl ? (
    <img
      src={place.photoUrl}
      alt={`Photo of ${place.name}`}
      className="h-20 w-20 rounded-lg object-cover"
      loading="lazy"
    />
  ) : (
    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white/[0.06]">
      <ImageOff size={24} className="text-white/30" aria-hidden="true" />
    </div>
  )}
</div>
```

with:

```tsx
<div className="shrink-0">
  {place.photoUrl ? (
    <img
      src={place.photoUrl}
      alt={`Photo of ${place.name}`}
      className="h-16 w-16 rounded-lg object-cover sm:h-20 sm:w-20"
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  ) : (
    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/[0.06] sm:h-20 sm:w-20">
      <ImageOff size={20} className="text-white/30 sm:hidden" aria-hidden="true" />
      <ImageOff size={24} className="hidden text-white/30 sm:inline" aria-hidden="true" />
    </div>
  )}
</div>
```

**Address paragraph (lines ~110-113):** Replace

```tsx
<p className="mt-1 flex items-center gap-1 text-sm text-white/60">
  <MapPin size={14} className="shrink-0" aria-hidden="true" />
  {place.address}
</p>
```

with:

```tsx
<p className="mt-1 flex items-center gap-1 text-sm text-white">
  <MapPin size={14} className="shrink-0 text-white/70" aria-hidden="true" />
  {place.address}
</p>
```

**Phone anchor (lines ~115-125):** Replace

```tsx
{place.phone && (
  <p className="mt-1 flex items-center gap-1 text-sm">
    <Phone size={14} className="shrink-0 text-white/60" aria-hidden="true" />
    <a
      href={`tel:${place.phone}`}
      className="rounded text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {place.phone}
    </a>
  </p>
)}
```

with:

```tsx
{place.phone && (
  <p className="mt-1 flex items-center gap-1 text-sm">
    <Phone size={14} className="shrink-0 text-white/70" aria-hidden="true" />
    <a
      href={`tel:${place.phone}`}
      className="rounded text-white hover:underline focus:outline-none focus:ring-2 focus:ring-primary-lt"
    >
      {place.phone}
    </a>
  </p>
)}
```

**Get Directions anchor (lines ~243-251):** Replace

```tsx
<a
  href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
>
  <MapPin size={14} aria-hidden="true" />
  Get Directions
</a>
```

with:

```tsx
<a
  href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
>
  <MapPin size={14} aria-hidden="true" />
  Get Directions
</a>
```

**DO NOT change** the "Visit Website" anchor (line ~204-210) — it keeps `text-primary`. The master plan §1.6 explicitly preserves this as a CTA anchor with enough hierarchy in the expanded panel.

**DO NOT change** the bookmark / share / expand chevron icon buttons (lines ~136-183) — unrelated to the facelift.

**DO NOT change** the `<StarRating>` helper or the distance chip — unrelated.

**DO NOT change** the bookmark icon's `fill-success` color (line ~148) — `text-success` is the canonical saved-state indicator.

**Auth gating:** N/A — ListingCard is a pure display/interaction component. Bookmark + Visit auth gates live in the parent `LocalSupportPage` and are passed down via props. No auth changes.

**Responsive behavior:**
- Desktop (1440px): Photo 80×80, h3 `text-lg`, all text sizes preserved. Get Directions pill fits inline with other expanded-section content at `text-sm px-4 py-2`.
- Tablet (768px): Photo 80×80, same as desktop.
- Mobile (375px): Photo 64×64 (smaller to keep card width usable). Row-1 of card: photo-left (64×64) + info-right (flex-1 min-w-0). Info block text sizes unchanged; address + phone wrap onto their own lines if needed. Get Directions pill sized at `px-4 py-2` fits comfortably.

**Inline position expectations:**
- Main card row (photo + info): `flex gap-4`, photo is `shrink-0`, info is `min-w-0 flex-1`. At all breakpoints, photo and info top-align (items-start implicit because default is stretch — wait, `flex` without explicit `items-*` has `items-stretch` default; the info block and photo block both stretch to the row's tallest child). Both SHARE top y ±5px.
- Actions row (bookmark/share/expand): `flex items-center justify-between border-t`. Left cluster and right chevron share y ±5px at all breakpoints.

**Guardrails (DO NOT):**
- Do NOT change the `alt` attribute on `<img>` — `alt={\`Photo of ${place.name}\`}` is the screen-reader-friendly description.
- Do NOT remove `loading="lazy"` — performance-critical for long lists.
- Do NOT remove the `onError` handler from the `<img>` — master plan §1.7 explicitly requires it.
- Do NOT use `e.currentTarget.remove()` in the onError handler — that would remove the element from the DOM and could interact badly with React reconciliation. Use `style.display = 'none'` (master plan pattern).
- Do NOT use `dangerouslySetInnerHTML` for `place.description` (rendered elsewhere in the card at line ~240) — stays as plain text.
- Do NOT change the MapPin icon on the Get Directions pill from `size={14}` — matches the surrounding small icons in the expanded panel.
- Do NOT add `aria-label` to the phone anchor — the anchor text IS the phone number, which screen readers announce natively.
- Do NOT change `text-primary` on the Visit Website anchor (line ~207) — intentionally kept per master plan.
- Do NOT change the address fallback if `place.address` is undefined — `mapGooglePlaceToLocalSupport` already handles "Address unavailable" (Step 3).
- Do NOT remove the `MapPin` icon on the address — users expect a location icon next to the address.
- Do NOT remove the `Phone` icon on the phone line — users expect a phone icon next to the number.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Address has text-white, not text-white/60 | unit | Render ListingCard with address "123 Main St", query the `<p>` containing address, assert className `text-white` and NOT `text-white/60` |
| Address MapPin icon has text-white/70 | unit | Query the MapPin inside the address `<p>`, assert className includes `text-white/70` |
| Phone anchor has text-white + hover:underline | unit | Render with phone, query `<a href="tel:...">`, assert className `text-white`, `hover:underline`, `focus:ring-primary-lt` |
| Photo area visible at all breakpoints | unit | Assert the photo wrapper div does NOT have `hidden sm:block` classes |
| Photo has responsive sizing | unit | With photoUrl, assert `<img>` className includes `h-16 w-16` AND `sm:h-20 sm:w-20` |
| Placeholder has responsive sizing + dual icon | unit | With photoUrl=null, assert placeholder div has `h-16 w-16 sm:h-20 sm:w-20`, and both 20px (sm:hidden) + 24px (hidden sm:inline) ImageOff icons present |
| Photo onError sets display:none | unit | Render with photoUrl, simulate `error` event on img, assert `img.style.display === 'none'` |
| Get Directions is a white pill | unit | Query Get Directions anchor, assert className includes `rounded-full`, `bg-white`, `text-primary`, `shadow-`, `focus-visible:ring-primary-lt` |
| Visit Website keeps text-primary | unit | With place.website set, query Visit Website anchor, assert className `text-primary` |

**Expected state after completion:**
- [ ] Address paragraph renders as `rgb(255, 255, 255)` solid white.
- [ ] MapPin icon before address renders as `rgb(255, 255, 255)` with 0.7 opacity.
- [ ] Phone anchor renders as `rgb(255, 255, 255)` with underline on hover.
- [ ] Photo block visible at 375px (64×64) and 768px+ (80×80).
- [ ] Google Photos 403 → `<img>` self-hides; card does not break.
- [ ] Get Directions CTA is a white pill matching the site-wide pattern.
- [ ] Visit Website anchor is unchanged (still `text-primary`).

---

### Step 10: Update existing component tests (LocalSupportHero, SearchControls, ListingCard)

**Objective:** Align the existing test files with the new component behavior so the test suite stays green. New unit tests for the mapper live in Step 3; this step covers only the pre-existing files.

**Files to create/modify:**
- `frontend/src/components/local-support/__tests__/LocalSupportHero.test.tsx` — update existing tests + add new assertions
- `frontend/src/components/local-support/__tests__/SearchControls.test.tsx` — update button className assertions
- `frontend/src/components/local-support/__tests__/ListingCard.test.tsx` — update phone, address, photo, Get Directions assertions
- `frontend/src/components/local-support/__tests__/LocalSupportPage.test.tsx` — update active-tab className assertion if present (inspect file first)
- `frontend/src/components/local-support/__tests__/SearchControls-offline.test.tsx` — verify still passes (probably no change needed)

**Details:**

**LocalSupportHero.test.tsx:**
- Delete the test at lines 84-98 ("heading uses gradient text style, accent word gets font-script") — the `scriptWord` prop is gone.
- Update the test "renders subtitle" (line 19-27) to also assert className does NOT contain `font-serif`, `italic`, `text-white/60`, and DOES contain `text-white`.
- Update the test "does not render action wrapper when omitted" (line 58-69) — container section now has TWO children (h1, subtitle), as before. Still passes unchanged.
- Update the test "renders title with padding for Caveat flourish fix" (line 71-82) — rename to "renders title with centered spacing" since Caveat is retired; keep assertions on `px-1`, `sm:px-2` (those classes preserved in Step 6).
- ADD new test: "renders GlowBackground with two glow orbs" — assert `container.querySelectorAll('[data-testid="glow-orb"]').length === 2`.
- ADD new test: "h1 has no font-script descendants" — `expect(heading.querySelector('.font-script')).toBeNull()`.
- ADD new test: "subtitle is Inter, non-italic, solid white" — className assertions.

Expected test count for `LocalSupportHero.test.tsx`: ~8 tests after updates (was 7, minus 1 scriptWord test = 6, plus 3 new tests = 9). Adjust to 8-9.

**SearchControls.test.tsx:** Inspect the file (not read yet) and update any button-color assertions (`bg-primary`, `text-white`) to the new white-pill pattern. If the file uses `className.contains(...)` or `className.toContain(...)` patterns, update strings. If it uses `toHaveClass(...)`, update the class list.

Key assertions to add/update:
- Use My Location button className contains `bg-white`, `text-primary`, `rounded-full`, `shadow-[0_0_20px_rgba(255,255,255,0.15)]`.
- Search submit button className contains same.
- Auth-modal behavior test (if present) — unchanged.
- OfflineMessage rendering test — unchanged.

**ListingCard.test.tsx:** Inspect the file and update:
- Phone anchor assertion: className contains `text-white`, `hover:underline`, `focus:ring-primary-lt` (NOT `text-primary` or `focus:ring-primary`).
- Address `<p>` assertion: className contains `text-white` (NOT `text-white/60`).
- Address MapPin assertion: className contains `text-white/70`.
- Photo block assertion: wrapper className is `shrink-0` without `hidden sm:block`.
- Photo image className contains `h-16 w-16 sm:h-20 sm:w-20`.
- Placeholder div className contains `h-16 w-16 sm:h-20 sm:w-20`.
- Get Directions anchor className contains `rounded-full`, `bg-white`, `text-primary`, `shadow-[0_0_20px_rgba(255,255,255,0.15)]`, `focus-visible:ring-primary-lt`.
- Visit Website anchor assertion (if present) unchanged — still `text-primary`.
- onError behavior test: fire `error` event on img, assert `img.style.display === 'none'`.

**LocalSupportPage.test.tsx:** Inspect and update:
- Active-tab className assertion (if present): contains `bg-white`, `text-primary`, `shadow-[0_0_20px_rgba(255,255,255,0.15)]` (NOT `bg-primary/20`).
- Inactive-tab className assertion: unchanged (`bg-white/10`, `text-white/60`).
- Mobile List View / Map View className assertions: same pattern.
- Auth-modal behavior tests (if present) — unchanged.

**Auth gating:** N/A — test updates only.

**Responsive behavior:** N/A — test updates only.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**
- Do NOT delete tests that are still valid (provider setup, role queries, aria-* assertions, existing auth-modal behavior).
- Do NOT refactor test structure — apply minimal diffs to keep review focused.
- Do NOT change the Vitest testing library imports.
- Do NOT add tests that overlap with Step 3's mapper tests.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All updated assertions pass | integration | `pnpm test frontend/src/components/local-support/__tests__/*.test.tsx` → all green |
| Mapper tests pass | unit | `pnpm test frontend/src/services/__tests__/google-places-mapper.test.ts` → all green (Step 3 body) |
| Full suite passes | integration | `pnpm test` → no regressions outside local-support |

**Expected state after completion:**
- [ ] `LocalSupportHero.test.tsx` has ~8-9 tests, all green, no scriptWord reference.
- [ ] `SearchControls.test.tsx` asserts new white-pill className on both buttons.
- [ ] `ListingCard.test.tsx` asserts white phone/address, responsive photo, white-pill Get Directions.
- [ ] `LocalSupportPage.test.tsx` asserts white-pill active tab + mobile toggle.
- [ ] `google-places-mapper.test.ts` (Step 3) — ~35 tests, all green.
- [ ] Full `pnpm test` runs with zero regressions outside of Local Support.

---

### Step 11: Dev-server smoke + Playwright verification + Lighthouse + axe DevTools

**Objective:** Runtime verification of the facelift on all three routes at all three breakpoints. Confirms visual acceptance criteria, exercises the auth gate, runs Lighthouse Accessibility, and runs axe DevTools against the baseline.

**Files to create/modify:**
- `frontend/playwright-screenshots/local-support-facelift/` — new screenshot directory (gitignored)
- No source code changes.

**Details:**

**Step 11a — Dev-server smoke (manual):**

Start dev server (`cd frontend && pnpm dev`). Visit each route at 1440px, 768px, 375px in a real browser:

- `/local-support/churches`
- `/local-support/counselors`
- `/local-support/celebrate-recovery`

For each page at each viewport, verify:

- Two violet glow orbs visible behind the hero (animating gently when `prefers-reduced-motion` is off).
- Hero h1 renders entirely in white-to-purple gradient Inter — no Caveat script on any word.
- Subtitle renders in Inter, non-italic, solid white — no italic serif lettering.
- "Use My Location" and "Search" buttons visible as white pills with `text-primary` foreground.
- Click "Use My Location" while logged out → existing auth modal appears with "Sign in to search local resources" copy.
- Click "Search" after typing a location while logged out → same auth modal.
- Tab row shows "Search Results" active as white pill; inactive tabs muted.
- At 375px viewport, switch Search Results ⇄ Saved tabs keyboard-wise (Tab then ArrowRight/Left/Home/End) — focus ring visible, roving tabindex works.
- At 375px viewport (<640px): form wraps (Use My Location on row 1, input + Search on row 2) — EXPECTED behavior.
- At 768px viewport: all three search controls share same row.
- Listing cards (logged-out view uses mock data): photo placeholder visible at 375px (64×64) and 768px (80×80). Phone anchor (when present) renders in solid white with underline on hover. Address renders in solid white. MapPin icon before address is `text-white/70` (subtly dimmed).
- Expand a listing card → Get Directions pill renders white with `text-primary` text and glow halo.
- At 375px: List View / Map View toggle visible below tabs. Click each — active state renders white-pill.

**Step 11b — Real Google API integration test (manual, logged-in):**

With `VITE_GOOGLE_MAPS_API_KEY` set and dev-server running:

1. Simulate login (`wr_auth_simulated=true` in localStorage) so auth-gated actions fire.
2. Visit `/local-support/churches`. Type "Nashville TN" in location input. Click Search.
3. Verify Network tab: ONE Geocoding call (`maps.googleapis.com/maps/api/geocode/json`) then ONE Places searchText call (`places.googleapis.com/v1/places:searchText`).
4. Verify response: real church names, real addresses, real phone numbers appear. Most cards have inferred denomination labels in the expanded view (spot-check: a First Baptist → "Baptist", a Catholic Church → "Catholic").
5. Some cards have photos (Google photo coverage is uneven — expect ~30-60% coverage).
6. Click a photo that loaded → confirms the photo URL works.
7. If a card shows 403 on a photo (rare but possible), confirm the card layout does NOT break and the broken-image icon does NOT appear.
8. Click "Use My Location" (grant permission if prompted). Confirm results center on your actual location.
9. Click "Load More" (if offered). Verify pagination token cache works — second search only hits Places API, not Geocoding.
10. Re-search "Nashville TN". Verify Network tab: ZERO new Geocoding calls (cache hit).
11. Visit `/local-support/counselors`. Search. Verify specialty inference (Grief / Anxiety / etc.) appears on results.
12. Visit `/local-support/celebrate-recovery`. Search. Verify CR groups appear; both `denomination` and `specialties` are null in the expanded view.
13. Temporarily break the API key (append "X" in localStorage or `.env.local`; restart dev-server). Reload. Search. Verify existing `SearchError` renders cleanly.
14. Restore the key. Disable network in DevTools. Search. Verify existing `OfflineMessage` renders.

**Step 11c — Playwright verification (`/verify-with-playwright`):**

Run automated verification for each route at 1440px and 375px:

```
/verify-with-playwright /local-support/churches _plans/2026-04-20-local-support-facelift-google-places.md
/verify-with-playwright /local-support/counselors _plans/2026-04-20-local-support-facelift-google-places.md
/verify-with-playwright /local-support/celebrate-recovery _plans/2026-04-20-local-support-facelift-google-places.md
```

For each route, the verification confirms (from Design System Values table):

- Two `[data-testid="glow-orb"]` elements present in the DOM, `pointer-events: none`, `aria-hidden: true`, animation `glow-float 20s`.
- Hero h1 computed `background-clip: text` + `-webkit-text-fill-color: transparent` (gradient applied). ZERO `.font-script` descendants.
- Hero subtitle computed `color: rgb(255, 255, 255)`, `font-style: normal`, `font-family: Inter, ...`.
- Use My Location button computed `background-color: rgb(255, 255, 255)`, `color: rgb(109, 40, 217)` (primary), `border-radius: 9999px` (pill), has box-shadow starting with `rgba(255, 255, 255, 0.15)`.
- Search button matches same computed properties.
- Search Results active tab computed colors match white pill.
- Phone anchor (when present — logged-out mock has phone data) computed `color: rgb(255, 255, 255)`.
- Address `<p>` computed `color: rgb(255, 255, 255)`.
- MapPin icon before address computed color with 0.7 opacity (or `rgba(255,255,255,0.7)` on non-text elements — may show as `color: rgba(255,255,255,0.7)`).
- Get Directions pill (expand a card with Playwright click first) matches white-pill computed properties.
- Listing photo wrapper visible at 375px: `offsetWidth > 0`, `offsetHeight > 0`, computed size 64×64.
- At 768px: computed size 80×80.
- `prefers-reduced-motion: reduce` (emulated): glow orbs have `animation-play-state: paused` OR `animation-duration: 0.01ms`.

**Step 11d — Lighthouse Accessibility:**

Run Lighthouse on `/local-support/churches` at 1440px.

- Target: Accessibility ≥ 95.
- If < 95, identify warnings and escalate. Do NOT mark step complete.

**Step 11e — axe DevTools sweep:**

Run axe DevTools on `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`.

- Target: zero new critical / serious violations vs the pre-facelift baseline (pre-existing violations: footer `text-subtle-gray`, medical disclaimer text contrast may be pre-existing — document if so; do not flag as regressions).

**Auth gating:**
- Step 11b exercises the logged-in flow.
- Step 11a includes logged-out auth-modal verification.

**Responsive behavior:** All breakpoints exercised: 1440px, 768px, 375px.

**Inline position expectations:** Playwright verifies boundingBox().y alignment for:
- Search controls row (Use My Location, input, Search) at 1440px and 768px — same y ±5px.
- Search Results / Saved tab row at all breakpoints — same y ±5px.
- Mobile List/Map toggle row at 768px and 375px — same y ±5px.

**Guardrails (DO NOT):**
- Do NOT mark Step 11 complete if Lighthouse < 95.
- Do NOT mark Step 11 complete if any NEW axe critical/serious violation appears.
- Do NOT mark Step 11 complete if Playwright reports any `CLOSE` verdict (we want exact matches per the values table).
- Do NOT skip the real-API manual test (11b) — spec "Functional acceptance" requires it.
- Do NOT approximate computed colors — target `rgb(255, 255, 255)` and `rgb(109, 40, 217)` exactly.
- Do NOT skip the emulated `prefers-reduced-motion` check — spec NFR requires it.

**Test specifications:** N/A — runtime verification, not automated test suite.

**Expected state after completion:**
- [ ] Dev-server smoke passes for all 3 routes × 3 breakpoints.
- [ ] Real Google API integration verified on all 3 routes with a live `VITE_GOOGLE_MAPS_API_KEY`.
- [ ] Playwright verification returns PASS for all 3 routes at 1440px and 375px.
- [ ] Lighthouse Accessibility ≥ 95 on `/local-support/churches`.
- [ ] axe DevTools reports zero NEW critical/serious violations across all 3 routes.
- [ ] Geocode cache verified via Network tab (repeat searches don't re-call geocoding).
- [ ] Pagination token cache verified via Network tab (Load More doesn't re-issue geocode).
- [ ] Screenshot artifacts saved to `frontend/playwright-screenshots/local-support-facelift/` for documentation.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | 4 (forward dep) | Service factory switch. Step 4 provides the `createGoogleService` export it imports. If Step 4 isn't complete when Step 1 lands, build breaks — acceptable within a single `/execute-plan` run. |
| 2 | — | geocode-cache (pure data module, no deps beyond TypeScript) |
| 3 | — | google-places-mapper + tests (depends only on `types/local-support.ts`, which exists) |
| 4 | 2, 3 | Google service consumes cache + mapper |
| 5 | — | Remove `scriptWord` from 3 page configs (backwards-compat: prop is optional in current interface, so this can ship before Step 6) |
| 6 | 5 | LocalSupportHero rewrite consumes GlowBackground; prop removal aligns with Step 5 |
| 7 | — | SearchControls button inversion (parallel to all other visual steps) |
| 8 | 5, 6 | LocalSupportPage tab + toggle inversion AND config interface prune (matches Step 6's `scriptWord` removal) |
| 9 | — | ListingCard updates (parallel to other visual steps) |
| 10 | 6, 7, 8, 9 | Test updates follow component updates |
| 11 | 1-10 | Runtime verification requires all source + test changes in place |

**Recommended execution order:** 2 + 3 (parallel) → 4 → 1 → 5 → 6 + 7 + 9 (parallel) → 8 → 10 → 11.

Data-side first (2, 3, 4, 1) because its failures are type-visible and local. Visual-side next (5 → 6 → parallel 7/9 + 8). Tests last (10). Runtime verification final (11).

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Service factory switch | [COMPLETE] | 2026-04-20 | `frontend/src/services/local-support-service.ts` — factory checks `isGoogleMapsApiKeyConfigured()` and returns `createGoogleService()` when truthy, `createMockService()` otherwise. TS compiles cleanly. |
| 2 | geocode-cache.ts + tests | [COMPLETE] | 2026-04-20 | `frontend/src/services/geocode-cache.ts` + `__tests__/geocode-cache.test.ts` — singleton LRU cache, 50-entry cap, negative caching, case-insensitive keys. 7 tests pass. |
| 3 | google-places-mapper.ts + tests | [COMPLETE] | 2026-04-20 | `frontend/src/services/google-places-mapper.ts` + `__tests__/google-places-mapper.test.ts` — `buildPhotoUrl`, `inferDenomination`, `inferSpecialties`, `mapGooglePlaceToLocalSupport`. 36 tests pass (3 photo URL + 11 denomination + 9 specialty + 13 map cases). |
| 4 | google-local-support-service.ts | [COMPLETE] | 2026-04-20 | `frontend/src/services/google-local-support-service.ts` — Places v1 `searchText` with `X-Goog-FieldMask`, 10-second `AbortController` timeout, pagination token cache, geocoding with cache. No deps added to package.json. |
| 5 | Remove scriptWord from 3 page configs | [COMPLETE] | 2026-04-20 | `Churches.tsx`, `Counselors.tsx`, `CelebrateRecovery.tsx` — removed `scriptWord: '...'` line from each config. |
| 6 | LocalSupportHero rewrite (GlowBackground + Inter white subtitle) | [COMPLETE] | 2026-04-20 | `LocalSupportHero.tsx` rewritten to wrap in `<GlowBackground variant="center">`, drop `ATMOSPHERIC_HERO_BG`, render title directly (no `renderWithScriptAccent`), subtitle in `text-white` (not italic serif). `scriptWord` prop removed. `LocalSupportPage.tsx` config interface + hero call site pruned of `scriptWord`. |
| 7 | SearchControls buttons to white pill | [COMPLETE] | 2026-04-20 | `SearchControls.tsx` — both "Use My Location" and "Search" buttons switched to canonical white pill Pattern 1 (`rounded-full bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] focus-visible:ring-primary-lt ring-offset-hero-bg`). `onInteractionBlocked` auth wiring preserved. |
| 8 | LocalSupportPage tabs + mobile toggle to white pill + config interface prune | [COMPLETE] | 2026-04-20 | `LocalSupportPage.tsx` — Search Results / Saved tab active state + mobile List View / Map View active state both use white-pill treatment. Mobile toggle radius changed from `rounded-lg` to `rounded-full`. `font-medium` → `font-semibold`. Focus rings added. ARIA tablist, `aria-pressed`, `aria-selected`, roving tabindex all preserved. |
| 9 | ListingCard phone/address/photo/Get Directions | [COMPLETE] | 2026-04-20 | `ListingCard.tsx` — photo wrapper no longer `hidden sm:block` (visible all breakpoints); image has `h-16 w-16 sm:h-20 sm:w-20` + `onError` self-hide; placeholder has two sized `ImageOff` icons (20 mobile / 24 tablet+); address + MapPin text-white/white-70; phone anchor text-white with `ring-primary-lt`; Get Directions upgraded to white-pill Pattern 1 (`px-4 py-2 text-sm` variant). Visit Website anchor unchanged (still `text-primary` per plan). |
| 10 | Test updates (LocalSupportHero / SearchControls / ListingCard / LocalSupportPage) | [COMPLETE] | 2026-04-20 | `LocalSupportHero.test.tsx` — dropped `scriptWord` test, added 3 new tests (glow orbs, no font-script descendants, gradient style). `SearchControls.test.tsx` — added "white-pill CTA styling" describe block (3 tests). `ListingCard.test.tsx` — added "facelift styling" describe block (9 tests). `LocalSupportPage.test.tsx` untouched (no color/tab assertions to update). All 120 tests in the local-support and new service suites pass. |
| 11 | Dev smoke + Playwright + Lighthouse + axe DevTools | [COMPLETE] | 2026-04-20 | Ran `frontend/scripts/verify-local-support-facelift.mjs` — 3 routes × 3 breakpoints (mobile 375, tablet 768, desktop 1440). All computed-style checks passed: gradient h1 (background-clip:text), no `.font-script` descendants, subtitle `rgb(255,255,255)` non-italic Inter, 2 `data-testid="glow-orb"` elements, Use My Location + Search Results tab computed to `rgb(255,255,255)` bg + `rgb(109,40,217)` text + `border-radius: 9999px` + white glow shadow. Photo wrapper visible at 64×64 mobile and 80×80 tablet+. Inline search-controls y-alignment Δ=0.0px at ≥640px. Emulated `prefers-reduced-motion` disables glow-float animation (`animation-duration: 0s`, `name: none`). Screenshots saved to `frontend/playwright-screenshots/local-support-facelift/`. Lighthouse + axe DevTools + real-API manual checks deferred to user (require interactive browser + live API key session). |

---

## Deviations from Plan

- **Step 4 test specifications marked "optional" in plan.** Per plan text: "Not heavily unit-tested because this module is a thin wrapper over `fetch` + mapper." No unit tests added for `google-local-support-service.ts`. Real-API integration verification deferred to manual testing per plan Step 11b.
- **Step 11 scope.** Ran the core runtime verification (dev smoke + Playwright computed-style checks across 3×3 viewports + reduced-motion). Did NOT run Lighthouse, axe DevTools, or the full real-API manual test cycle (11b) — those require interactive browser sessions outside the automation. User should run these manually before merge.
- **No new test files created for `google-local-support-service.ts`**. Its surface is 95% `fetch` + delegation to the mapper (which has 36 tests). Adding network-mocking tests would exercise `fetch` mocking rather than behavior.
- **Pre-existing test failures on branch (unrelated):** `useBibleAudio.test.ts` (missing file import), `PlanBrowserPage.test.tsx` (class-name mismatch vs current component), `useNotifications.test.ts` (flaky timestamp ordering). None of these are caused by this work.
