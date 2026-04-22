# Local Support Facelift + Google Places API Integration

**Plan Reference:** `_plans/2026-04-20-local-support-facelift-google-places.md`
- The plan file is the detailed implementation source of truth for this spec and includes code samples, file maps, and the full mapper contract. This spec captures the product-level intent, auth behavior, responsive behavior, and acceptance criteria that `/code-review --spec` and `/verify-with-playwright` will check against.

---

## Overview

The three Local Support pages (`/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`) currently look visually stale next to the rest of the site — mismatched fonts (Caveat script accent + serif italic subtitle), dim phone/address text (`text-primary`, `text-white/60`) that's genuinely hard to read on the dark background, purple-filled buttons that fight the site-wide white-pill CTA pattern, and a flat hero with no atmospheric depth. They also ship with 30 rows of hardcoded mock data — every listing is fake, every `photoUrl` is null, and no user has ever seen a real nearby church or counselor through the app.

This facelift brings all three pages to visual parity with the Music Round 2 and Grow detail facelifts, wraps each hero in the same animated violet glow orbs used on the homepage, and replaces the mock service with real Google Places API data so a user searching "Nashville TN" sees actual churches with real photos, phone numbers, addresses, and denominations. The mission framing: a user reaching for local in-person support in a moment of need deserves accurate information and a page that feels like it belongs to the same quiet sanctuary as the rest of Worship Room.

## User Story

As a **logged-out visitor** searching for a church, Christian counselor, or Celebrate Recovery group near me, I want to **see real nearby places with photos, phone numbers, addresses, and denomination labels on a page that feels as polished as the rest of the site**, so that **I can actually take the next step to visit or call a real local resource when I need support**.

## Requirements

### Functional Requirements

1. All three Local Support pages (`/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`) render with the animated violet glow-orb background (same component and variant as the homepage hero) behind the hero region.
2. Hero h1 on all three pages renders in uniform gradient Inter — no Caveat (`font-script`) accent on any word. The `scriptWord` prop is removed from all three page configs; retiring the prop from the shared interfaces is preferred but optional.
3. Hero subtitle on all three pages renders in Inter, non-italic, solid white (`text-white`). The `font-serif italic text-white/60` treatment is retired.
4. "Use My Location", "Search", "Search Results" tab active state, "Saved" tab active state, and the mobile "List View" / "Map View" toggle active states all render as a white pill (`bg-white`, `text-primary`, `rounded-full`, `font-semibold`) with the canonical white-glow halo shadow. Inactive tab state stays the muted ghost treatment.
5. Phone numbers on listing cards render as `text-white` with hover underline preserved for affordance. The `text-primary` treatment is retired. Focus ring uses `ring-primary-lt` to match the rest of the site.
6. Addresses on listing cards render as `text-white`. The `MapPin` icon preceding the address remains slightly muted (`text-white/70`) so the icon reads as decoration, not content.
7. "Get Directions" CTA in the expanded listing card renders as a white pill matching the site-wide primary CTA pattern.
8. Listing card photo area is visible at all breakpoints (not `hidden sm:block`). Photo is 64×64 on mobile and 80×80 at tablet+. When `photoUrl` is null, the existing `ImageOff` placeholder renders. When a photo URL fails to load, the image element self-hides gracefully (no broken-image browser default).
9. When `VITE_GOOGLE_MAPS_API_KEY` is configured, `createLocalSupportService()` returns a real Google Places API implementation conforming to the existing `LocalSupportService` interface. When the key is absent (CI, tests, new dev setups), the existing mock service is returned as a fallback.
10. The Google service uses Places API (New) v1 `searchText` endpoint with a `locationBias` circle. Responses are pruned via `X-Goog-FieldMask` to only the fields the app actually uses (billing optimization).
11. Pagination uses Google's `nextPageToken`. A module-level token cache keyed by (lat, lng, radius, keyword) supports at least two pages of results where nearby data is dense enough.
12. Geocoding uses the Google Geocoding API. An in-memory session-scoped LRU cache (max 50 entries, keyed by lowercased trimmed query) prevents repeat calls for the same input. Negative results are also cached to avoid hammering the API on typos.
13. Denomination inference runs on church results only. Name and `editorialSummary` are scanned against the existing `DENOMINATION_OPTIONS` vocabulary via ordered text-match patterns ("Church of Christ" tested before "Christ"-only patterns; "Non-denominational" and "nondenominational" both matched). Unmatched results get `denomination: null`.
14. Specialty inference runs on counselor results only. Name and `editorialSummary` are scanned against the `SPECIALTY_OPTIONS` vocabulary via regex patterns (grief/anxiety/depression/addiction/marriage/trauma/family). Up to 3 specialties returned. Unmatched results default to `['General']`.
15. Places with `businessStatus: 'CLOSED_PERMANENTLY'` or missing `displayName.text` / `location` are filtered out by the mapper.
16. Photo URLs are built against the Places Photo media endpoint with `maxWidthPx=400` and the API key embedded as a query param (the documented pattern; production HTTP referrer restrictions in Google Cloud Console are the security boundary).
17. API errors, network failures, and 10-second timeouts all throw `Error` — the existing `LocalSupportPage.handleSearch` try/catch catches them and the existing `SearchError` UI renders cleanly. No new error surfaces added.
18. The existing `handleVisit` Faith Points "localVisit" recording logic is unchanged — this facelift is visual + data wiring only.
19. Leaflet + CARTO map rendering is unchanged. Google Places is used only for data (nearby search, place details, photos, geocoding). Map tiles stay OpenStreetMap via CARTO dark theme.
20. The mock service file (`mock-local-support-service.ts`) is untouched. It continues to serve as the fallback when no API key is configured.

### Non-Functional Requirements

- **Performance:** Places API responses mapped synchronously within the existing `handleSearch` async flow. No new loading states introduced. 10s fetch timeout via `AbortController` so a slow Google response doesn't hang the UI indefinitely.
- **Accessibility:** Lighthouse Accessibility ≥ 95 on `/local-support/churches` after facelift. All white-pill buttons have `focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`. Phone links preserve `tel:` href; addresses stay plain text; photos keep descriptive `alt` attributes. Glow orbs are `pointer-events-none` and `aria-hidden="true"`. `prefers-reduced-motion: reduce` pauses orb float animation (baked into `GlowBackground`).
- **API cost containment:** `X-Goog-FieldMask` restricts each Places request to only used fields. Geocode cache prevents repeated same-query calls. Pagination token cache prevents re-issuing the whole search on page-2 requests. These are production-cost-critical — without them, the field defaults triple the per-request billable amount.
- **API key security:** The key ships to the browser. Security model depends on HTTP referrer restrictions configured in Google Cloud Console before production deploy (operational checklist, not code). API restrictions should limit the key to Places API (New) + Geocoding API only. Monthly budget alert recommended in Google Cloud Console.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| Browse Local Support pages (Churches/Counselors/CR) | Full access — pages render, hero visible, glow orbs animate, search controls visible | Same — full access | N/A |
| Type a location into the search input | Allowed — input is a controlled text field, no gating | Same | N/A |
| Click "Use My Location" | Auth modal ("Sign in to search local resources") — existing behavior preserved | Geolocation + search runs | "Sign in to search local resources" _(existing copy, unchanged)_ |
| Click "Search" | Auth modal — existing behavior preserved | Geocode + Places search runs | "Sign in to search local resources" _(existing copy, unchanged)_ |
| Click a result card to expand details | Allowed — expanded details visible without login | Same | N/A |
| Click "Get Directions" white-pill CTA | External link to Google Maps — no gating needed | Same | N/A |
| Click "Visit Website" anchor in expanded details | External link — no gating | Same | N/A |
| Click "I Visited" (bookmark / visit log) | Auth modal — existing behavior preserved | Records visit, awards localVisit faith points via existing `handleVisit` callback | "Sign in to save places you've visited" _(existing copy, unchanged)_ |
| Click the phone number | `tel:` link — opens dialer, no gating | Same | N/A |
| Switch between "Search Results" and "Saved" tabs | "Saved" tab empty for logged-out (no gating on the tab itself; the inability to save content is the gate) | "Saved" shows user's saved places | N/A |

**This spec does NOT introduce new auth gates or modify existing ones.** All auth-modal wiring in `SearchControls.tsx`, `LocalSupportPage.tsx`, and `ListingCard.tsx` is preserved exactly as-is. The facelift changes only visual treatment (colors, fonts, shadows, padding, pill shape) and the data source (mock → Google). The phrase `onInteractionBlocked ?? handleUseMyLocation` pattern in `SearchControls.tsx` stays intact.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Hero pt-32 pb-8, h1 `text-3xl`, subtitle `text-base`. Glow orbs scale proportionally (handled by `GlowBackground`'s internal CSS). Listing photo renders at 64×64. Mobile-only List/Map view toggle visible below search controls (white-pill active state). `ResultsList` and `ResultsMap` are mutually exclusive on mobile — only one renders at a time based on `mobileView` state. `ListingCard` stacks photo on the left at 64×64, details stack vertically to its right. "Get Directions" pill is full-width-of-column. |
| Tablet (640–1024px) | Hero pt-36 pb-12, h1 `text-4xl`, subtitle `text-lg`. Listing photo renders at 80×80. Mobile List/Map toggle is hidden — both list and map are visible side-by-side (existing layout). `ListingCard` photo + details side-by-side. |
| Desktop (> 1024px) | Hero pt-40 pb-12, h1 `text-5xl`, subtitle `text-lg`. Listing photo 80×80. List+Map side-by-side (existing). Glow orbs' blur increases to `blur-[80px]` (canonical `GlowBackground` config). |

**Responsive-specific behaviors:**
- The "List View" / "Map View" toggle buttons only render below the `sm` breakpoint. Both use the new white-pill active treatment.
- Listing card photo is `hidden shrink-0 sm:block` today → becomes `shrink-0` with responsive sizing so photos show at all breakpoints.
- Focus rings (`focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`) render identically at all breakpoints.
- Glow orbs use `will-change-transform` and `blur-[60px] md:blur-[80px]` (canonical `GlowBackground` config) — they scale cleanly from mobile to desktop without custom breakpoint logic.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input beyond a short location search field (e.g., "Nashville TN"). No crisis detection required. The location input is constrained to place-name geocoding and never posts user-generated content anywhere. The `editorialSummary` field returned from Google Places is treated as untrusted text and rendered through React's default escaping (plain text, no `dangerouslySetInnerHTML`) per `.claude/rules/02-security.md`.

## Auth & Persistence

- **Logged-out users:** Full read access to all three pages. Location input, search, and result expansion all work. "Use My Location", "Search", and "I Visited" trigger the existing auth modal — no change to this behavior. Zero writes to localStorage or backend from logged-out users (per the Demo Mode Data Policy in `02-security.md`).
- **Logged-in users:** "I Visited" writes to `wr_local_visits` (existing key, unchanged — see `11-local-storage-keys.md` § "Local Support"). No new localStorage keys are introduced by this facelift. No backend writes — Local Support has no backend persistence today; Phase 3 may add a backend-backed "visited" list, scoped separately.
- **localStorage usage (new):** None. The geocode cache is in-memory only (session-scoped `Map`), and the Google Places pagination token cache is also in-memory only (module-level `Map`). Both reset on page reload. **No new `wr_*` keys are introduced by this spec; `11-local-storage-keys.md` does not need to be updated.**
- **API key storage:** `VITE_GOOGLE_MAPS_API_KEY` is an environment variable (already documented in `.env.example`, already set in `.env.local`). Never committed to source.

## Completion & Navigation

N/A — Local Support is a standalone feature, not part of the Daily Hub completion tracking system. Users arriving here do not count toward daily activity completion, faith points are awarded only via the existing `handleVisit` callback (unchanged), and there is no "next step" CTA after search results render.

## Design Notes

- **Reuse the existing `<GlowBackground variant="center">` component** (`frontend/src/components/homepage/GlowBackground.tsx`) — it's already battle-tested on the home page sections. Wrap `LocalSupportHero`'s `<section>` inside it. Remove the `ATMOSPHERIC_HERO_BG` radial gradient that the hero uses today (`GlowBackground` owns the background treatment after this facelift). Keep the `ATMOSPHERIC_HERO_BG` export in `PageHero.tsx` — other pages still use it.
- **Reuse the canonical white-pill CTA pattern** — the exact class string used throughout the site for primary actions (reference: the white "Help Me Pray" button in `PrayerInput`, the homepage Hero "Get Started" CTA, the Grow white-pill actions). Class fingerprint: `rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50`. Apply this to "Use My Location", "Search", "Search Results"/"Saved" tab active states, mobile List/Map toggle active states, and "Get Directions".
- **Retire the `scriptWord` / `renderWithScriptAccent` pattern on Local Support.** This is the same anti-pattern already retired from Grow and Music heroes. Leave `renderWithScriptAccent` alone in `PageHero.tsx` — other pages still use it. Only remove it from the Local Support usage.
- **Retire the `font-serif italic text-white/60` subtitle treatment.** Inter, non-italic, solid white is the Round 3 post-facelift norm for subtitles on inner pages.
- **Retire `text-primary` on small info text** (phone numbers, and the `bg-primary/10 text-primary` "Get Directions" chip). Keep `text-primary` on the "Visit Website" anchor in the expanded details panel — it reads as a CTA rather than info text, and the expanded panel has enough other hierarchy.
- **Existing shared components reused:** `GlowBackground`, `GRADIENT_TEXT_STYLE` (from `@/constants/gradients`), existing `LocalSupportHero` / `LocalSupportPage` / `SearchControls` / `ResultsList` / `ResultsMap` / `ListingCard` component tree, `requireGoogleMapsApiKey()` / `isGoogleMapsApiKeyConfigured()` accessors in `lib/env.ts`, existing `SearchError` / `OfflineMessage` / auth modal wiring.
- **Existing vocabularies reused for inference:** `DENOMINATION_OPTIONS` and `SPECIALTY_OPTIONS` from `types/local-support.ts`.
- **New visual patterns introduced:** None. Every visual treatment in this facelift is an existing site-wide pattern being applied to a new surface. The `GlowBackground`-on-non-home-page usage is a new application of an existing component, not a new pattern. No values should be marked `[UNVERIFIED]` during `/plan` — the class strings and component wiring are all directly derivable from existing code.
- **Design system recon:** `_plans/recon/design-system.md` exists and documents the canonical white-pill pattern and glow orb treatment. `/plan` and `/verify-with-playwright` should reference it for exact computed values.

## Out of Scope

- Backend proxy for the Google Maps API key. Phase 3 concern — the key ships to the browser for now, protected by HTTP referrer restrictions configured in Google Cloud Console.
- Swapping Leaflet for Google Maps JS map rendering. Keeping Leaflet + CARTO for map tiles. Google Places is used only for data.
- Dedicated place detail pages beyond the existing expand-card behavior in `ListingCard`. A deeper place page would be a follow-up feature.
- Google Places Autocomplete on the location input. Current free-text geocoding is sufficient for the first wiring pass.
- Review UGC (user-submitted reviews, ratings, visits displayed socially, admin tools over local places). Visual + data wiring only.
- Photo upload or fallback image selection for places that have no Google-sourced photo. `ImageOff` placeholder remains the fallback.
- Pagination beyond Google Places' `next_page_token` tier (max 60 results total per Google's own cap — 3 pages of 20). Results beyond that tier are not accessible without a different approach.
- Faith Points `localVisit` recording logic changes. `handleVisit` callback stays exactly as-is.
- A new `wr_*` localStorage key inventory entry. Nothing new is persisted to localStorage by this facelift.
- Adding `@googlemaps/js-api-loader` to `package.json`. The plan file mentions this dependency but ultimately the implementation uses raw `fetch()` and does not need it. Only install if actually imported during execution.
- Production operational setup (HTTP referrer restrictions, API restrictions, monthly budget alerts in Google Cloud Console). Operational checklist, not code — separate from this spec.
- Error states beyond what exists today. The existing `SearchError`, `OfflineMessage`, and empty-state UI are preserved exactly as-is.
- Mock data removal. `mock-local-support-service.ts` stays in the repo as the no-key fallback.

## Acceptance Criteria

### Visual (Playwright-verified at 1440px and 375px on all three routes)

- [ ] `/local-support/churches`, `/local-support/counselors`, and `/local-support/celebrate-recovery` each render two animated violet glow orbs behind the hero region, sourced from `<GlowBackground variant="center">`. Orbs are `pointer-events-none` and `aria-hidden="true"`.
- [ ] Hero h1 on all three pages contains zero `.font-script` descendants. Every word in the h1 renders in the gradient Inter treatment (`GRADIENT_TEXT_STYLE` applied to the whole h1, not a wrapped sub-span).
- [ ] Hero subtitle on all three pages has computed `color: rgb(255, 255, 255)`, `font-style: normal`, `font-family: Inter, ...` (not Lora). No `text-white/60`, no `font-serif`, no `italic`.
- [ ] "Use My Location" button has computed `background-color: rgb(255, 255, 255)`, `color: rgb(109, 40, 217)` (primary), `border-radius: 9999px` (pill), and the white-glow halo shadow.
- [ ] "Search" submit button matches the same computed properties.
- [ ] "Search Results" tab in active state has `background-color: rgb(255, 255, 255)`, `color: rgb(109, 40, 217)`, pill shape, and glow halo. Inactive tabs retain the muted ghost treatment (`bg-white/10`, `text-white/60`).
- [ ] "Saved" tab in active state matches the active "Search Results" treatment.
- [ ] Mobile (< 640px) "List View" / "Map View" toggle active state matches the white-pill treatment.
- [ ] Listing card phone anchor has computed `color: rgb(255, 255, 255)`. Hover applies `text-decoration: underline`. Focus ring uses `ring-primary-lt`.
- [ ] Listing card address paragraph has computed `color: rgb(255, 255, 255)`. `MapPin` icon preceding it has `color: rgb(255, 255, 255)` with `opacity: 0.7` (or the equivalent `text-white/70`).
- [ ] "Get Directions" CTA in expanded card has computed `background-color: rgb(255, 255, 255)`, `color: rgb(109, 40, 217)`, `border-radius: 9999px`, and the white-glow halo shadow.
- [ ] Listing card photo area is visible at both 1440px and 375px. At 375px the photo is 64×64; at 1440px it's 80×80.
- [ ] When `photoUrl` is null (mock fallback scenario), the `ImageOff` placeholder renders at the responsive sizes (20px icon at mobile, 24px at tablet+).
- [ ] `prefers-reduced-motion: reduce` pauses the glow float animation (verified via Playwright emulation).

### Functional (manual verification with `VITE_GOOGLE_MAPS_API_KEY` set)

- [ ] `createLocalSupportService()` returns the Google service when the env key is present and truthy; returns the mock service otherwise. Verified with/without the key set.
- [ ] Loading `/local-support/churches` and clicking "Use My Location" (after granting permission while logged in) produces a list of real nearby churches with real names, real addresses, and real phone numbers.
- [ ] At least some church results have photos (Google Places photo coverage is uneven; not all will). Photos that do load render inside the 80×80 (or 64×64 mobile) image slot.
- [ ] At least some church results have a correctly inferred denomination. Spot-check: a "First Baptist Church" should return `denomination: 'Baptist'`; a "St. Catherine of Siena Catholic Church" should return `denomination: 'Catholic'`.
- [ ] At least some counselor results have a correctly inferred specialty. Spot-check: "Hope Renewed — Grief Counseling" should return `specialties: ['Grief']`. Generic centers default to `['General']`.
- [ ] Searching "Nashville TN" in the location input geocodes to Nashville coordinates and returns results centered on Nashville.
- [ ] Searching the same query twice in the same session hits the in-memory geocode cache (verified via Network tab — only one Geocoding API call for the pair).
- [ ] Clicking "Load More" (if offered based on `hasMore`) returns a second page of results via `nextPageToken`. The module-level token cache keys on (lat, lng, radius, keyword).
- [ ] A photo URL that 403s or fails to load causes the `<img>` element to self-hide via `onError` — no broken-image icon. The card layout does not break.
- [ ] A `CLOSED_PERMANENTLY` place in a response is filtered out by the mapper before reaching the UI.
- [ ] With network disabled, the existing `OfflineMessage` renders (no new offline UI introduced).
- [ ] With an invalid API key, the existing `SearchError` state renders after the 10-second timeout or on the first 4xx response.

### Auth (verified both logged-in and logged-out)

- [ ] Logged-out user can browse all three pages, see the glow orbs, see the facelift, and type in the location input. No auth modal triggered by page load or typing.
- [ ] Logged-out user clicking "Use My Location" triggers the existing auth modal with the existing copy. Behavior is unchanged from today.
- [ ] Logged-out user clicking "Search" triggers the existing auth modal. Behavior unchanged.
- [ ] Logged-out user clicking a result card can still expand/collapse the details panel. Behavior unchanged.
- [ ] Logged-out user clicking "I Visited" triggers the existing auth modal. Behavior unchanged.
- [ ] Logged-in user search/visit flows work end-to-end with real Google data.
- [ ] No new auth modal messages are introduced. No existing auth modal messages are changed.

### Accessibility

- [ ] Lighthouse Accessibility ≥ 95 on `/local-support/churches` post-facelift.
- [ ] axe DevTools sweep on all three pages reports zero new violations introduced by the facelift.
- [ ] Focus ring on all new white-pill buttons is visible at ≥ 3:1 contrast against the dark hero background (`ring-primary-lt` on `ring-offset-hero-bg` passes AA).
- [ ] Keyboard navigation through the hero → search controls → result cards → expand → "Get Directions" works in document order without focus traps.
- [ ] Screen reader announcement of phone anchor says the phone number (tel: link preserved; anchor text is the phone number itself).
- [ ] Screen reader announcement of address paragraph reads the address (plain text, MapPin is `aria-hidden`).

### Tests

- [ ] `google-places-mapper.test.ts` covers: denomination inference for Baptist / Catholic / Methodist / Presbyterian / Lutheran / Church of Christ / Non-denominational / nondenominational / unmatched; specialty inference for Grief / Anxiety / Depression / Addiction / Marriage / Trauma / Family / General fallback / multiple matches capped at 3; `mapGooglePlaceToLocalSupport` filtering for `CLOSED_PERMANENTLY` / missing `displayName` / missing `location`; happy-path mapping with photoUrl and inference.
- [ ] Existing `LocalSupportHero.test.tsx` updated to assert no `font-serif`, no `italic`, no Caveat, white subtitle color, and `GlowBackground` rendered as ancestor.
- [ ] Existing `SearchControls.test.tsx` updated to assert new button computed colors.
- [ ] Existing `ListingCard.test.tsx` updated to assert phone and address computed colors, photo visibility at all breakpoints, and the "Get Directions" white-pill treatment.
- [ ] `ResultsMap.test.tsx` requires no change (Leaflet unchanged).
- [ ] All existing mock-data tests continue to pass unchanged (mock service untouched).

### Scope boundaries

- [ ] Zero new `wr_*` localStorage keys introduced. `11-local-storage-keys.md` not modified.
- [ ] Zero new auth gates introduced. No changes to existing auth modal copy.
- [ ] Zero changes to `handleVisit` or Faith Points `localVisit` logic.
- [ ] Zero changes to `mock-local-support-service.ts`.
- [ ] Zero changes to Leaflet / CARTO / `ResultsMap`.
- [ ] Zero new dependencies added to `package.json` unless actually imported during execution (`@googlemaps/js-api-loader` is NOT required if raw `fetch()` is used, as the plan file suggests).
