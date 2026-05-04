# Worship Room — Local Support Recon Report

**Generated:** 2026-05-04
**Branch:** forums-wave-continued
**Scope:** Pre-spec reconnaissance for Local Support visual migration. **No code changes made.**

---

## Part 1 — Page-Level Architecture

### Component file paths

- **Three thin page wrappers** (one per category — each is a config-only shell around the shared component):
  - `frontend/src/pages/Churches.tsx` (33 LOC) — config: `'churches'`, `DENOMINATION_OPTIONS`, denomination filter
  - `frontend/src/pages/Counselors.tsx` (35 LOC) — config: `'counselors'`, `SPECIALTY_OPTIONS`, specialty filter, **disclaimer copy**
  - `frontend/src/pages/CelebrateRecovery.tsx` (43 LOC) — config: `'celebrate-recovery'`, no filter, **`extraHeroContent` "What is CR" panel**
- **Shared shell:** `frontend/src/components/local-support/LocalSupportPage.tsx` (462 LOC) — receives a `config` object and renders the chrome (Navbar / hero / disclaimer / search controls / tabs / results) for all three categories.

### Routes that render it

Local Support is mounted at exactly **three sibling routes**, each loading its own page wrapper:

```tsx
// App.tsx line 284-287
<Route path="/local-support/churches"           element={<Churches />} />
<Route path="/local-support/counselors"         element={<Counselors />} />
<Route path="/local-support/celebrate-recovery" element={<CelebrateRecovery />} />
```

All three are public (no auth gate at route level). Lazy-loaded via `React.lazy` (App.tsx:70-72). No `RouteErrorBoundary` wrap and no Suspense skeleton — these routes fall through to the global `Suspense` fallback. That's a quiet accessibility/UX gap to flag (other pages get `RouteErrorBoundary` + per-page skeleton).

**There is NO `/local-support` index route.** The Navbar's "Local Support" label links to `/local-support/churches` as its default landing (per `10-ux-flows.md:21`).

### Top-level structure

LocalSupportPage does **NOT** use `Layout.tsx`, `BackgroundCanvas`, or `HorizonGlow`. It uses a **plain root div** with `bg-dashboard-dark`:

```tsx
// LocalSupportPage.tsx line 240
<div className="flex min-h-screen flex-col bg-dashboard-dark font-sans">
  <a href="#main-content" className="...skip link...">Skip to content</a>
  <Navbar transparent />
  <LocalSupportHero ... />          {/* wraps content in <GlowBackground variant="center"> */}
  <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
    {/* disclaimer (Counselors only), search controls, tabs, search states, results grid */}
  </main>
  <SiteFooter />
</div>
```

- **Background color:** `bg-dashboard-dark` (custom Tailwind alias = `#0f0a1e`) — same flat dark surface as the post-2.75 Dashboard, NOT the Round 3 `bg-hero-bg` (#08051A).
- **Hero zone:** `<LocalSupportHero>` wraps its `<section>` in `<GlowBackground variant="center">`. This is one of two `GlowBackground` consumers outside of the homepage — **and is therefore a Daily-Hub-style migration target if we want to standardize the atmospheric layer**.
- **Hero spacing:** `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40` — heavy top padding so content clears the absolute-positioned navbar.
- **Content frame:** `<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">` — a single 6xl-constrained column.
- **Results layout:** desktop renders side-by-side via `hidden lg:grid lg:grid-cols-2 lg:gap-6` (left: list with internal scroll `max-h-[calc(100vh-12rem)] overflow-y-auto`, right: sticky map `sticky top-24 h-[calc(100vh-12rem)]`). Mobile (`lg:hidden`) toggles a single panel between List View / Map View via `mobileView` state.

### Authentication behavior

LocalSupportPage uses `useAuth()` + `useAuthModal()` for **action-level gating**, not route-level gating.

| Action | Logged-out behavior | Logged-in behavior |
|---|---|---|
| Visit any of the 3 routes | Page renders; SearchPrompt shows | Page renders; SearchPrompt shows |
| Type city / use geolocation / click Search | Works freely (mock service or Google service per backend readiness probe) | Works freely |
| View results | Visible | Visible |
| Click "Get Directions" | External link works | External link works |
| Click bookmark icon on a listing | `authModal.openAuthModal('Sign in to bookmark listings')` | Toggles in `wr_bookmarks_<category>` localStorage |
| Click "I visited" button | Hidden (`showVisitButton={isAuthenticated}`) | Adds entry to `wr_local_visits`, fires `recordActivity('localVisit')`, shows toast "Visit recorded. That took courage. +10 faith points." |
| Saved tab | Hidden (only "Search Results" tab renders) | Visible with `(N)` count badge |
| Listing share dropdown | Works | Works |
| ListingCTAs ("Pray for this church", etc.) | Routes to `/daily?tab=pray` etc. — destination handles its own auth gate | Routes to `/daily?tab=pray` |

**Documented baseline mismatch:** `.claude/rules/02-security.md:23` lists "Local Support search" as auth-gated, but the implementation does **not** gate search — only bookmarking and visit recording. The 11 pre-existing test failures noted in CLAUDE.md include "logged-out mock listing cards in Local Support / Counselors / Celebrate Recovery / Churches," which suggests tests were written expecting gated search and now fail since the code allows it. This is an existing rule/code drift the migration spec should resolve (either reword the rule or restore the intended gate).

**Geolocation:** `Permissions-Policy: geolocation=(self)` is allowed specifically because of Local Support (per `02-security.md:188`). `SearchControls.handleUseMyLocation` calls `navigator.geolocation.getCurrentPosition` with a 10s timeout.

---

## Part 2 — Section-by-Section Inventory (render order)

### Always-mounted shell (outside `<main>`)

| # | Section | Component | File | Conditions | Visual treatment | Padding | Position |
|---|---|---|---|---|---|---|---|
| 1 | SEO meta | `<SEO>` | `components/SEO.tsx` | always | (head only) | n/a | `<head>` |
| 2 | Skip link | inline `<a>` | LocalSupportPage.tsx:241 | always | sr-only until focus | n/a | top |
| 3 | Navbar | `<Navbar transparent />` | `components/Navbar.tsx` | always | glassmorphic, transparent prop ⇒ absolute over hero | n/a | top, fixed |
| 4 | LocalSupportHero | `<LocalSupportHero>` | `components/local-support/LocalSupportHero.tsx` | always | **`<GlowBackground variant="center">` wrapping a centered hero** | `pt-32 pb-8 sm:pt-36 sm:pb-12 lg:pt-40 px-4 text-center` | full-width |
| 5 | SiteFooter | `<SiteFooter>` | `components/SiteFooter.tsx` | always | dark-purple footer | per component | bottom |

### `<main>` content (in source order)

| # | Section / Widget | File | Render conditions | Current visual treatment (key class strings) | Layout slot | Interactive elements | States | Data hook |
|---|---|---|---|---|---|---|---|---|
| 1 | **Disclaimer** | inline in LocalSupportPage.tsx:257 | `config.disclaimer` truthy (Counselors only) | `rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-200`, `role="note"` | full-width above search | none | always | constants (config prop) |
| 2 | **SearchControls** | `components/local-support/SearchControls.tsx` (215 LOC) | always | rolls-own form. Use-My-Location button + city input + Search button (white pill CTAs `bg-white px-6 py-2.5 text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)]`). Range slider with mile markers. | full-width | text input, geolocation button, search button, range slider 1–100 mi (debounced 500ms), offline message gate | idle / geolocating / loading / error | `useOnlineStatus`, `navigator.geolocation`, geocode service prop |
| 2a | **OfflineMessage** | `components/pwa/OfflineMessage.tsx` (shared) | `!useOnlineStatus().isOnline` | `variant="light"` light-themed offline placeholder replaces SearchControls entirely | full-width | none | offline | `useOnlineStatus` |
| 3 | **Tab bar** ("Search Results" / "Saved (N)") | inline in LocalSupportPage.tsx:278 | always (Saved tab gated by `isAuthenticated`) | `role="tablist"`. Active tab `bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]`. Inactive `bg-white/10 text-white/60 hover:bg-white/15`. Roving tabindex + Home/End/ArrowLeft/Right kbd nav. | full-width | 1 or 2 buttons | active / inactive | `activeTab` state |
| 4 | **Search states (aria-live region)** | `components/local-support/SearchStates.tsx` (102 LOC) | based on `searchState` | wrap `<div aria-live="polite" aria-atomic="true">`. Renders one of `SearchPrompt`, `ListingSkeleton`, `SearchError`, `NoResults`, or `<span class="sr-only">N results found</span>`. | full-width | retry button on error | idle / loading / error / empty | `searchState`, `searchResults.length` |
| 4a | `<SearchPrompt>` | SearchStates.tsx:22 | `searchState === 'idle'` | `FeatureEmptyState` w/ `MapPin` icon + "Find support near you" + "Enter your location to find {category} near you." | full-width | none | empty (idle) | constants |
| 4b | `<ListingSkeleton>` | SearchStates.tsx:74 | `searchState === 'loading'` | 3 skeleton cards `rounded-xl border border-white/10 bg-white/[0.06] p-5 sm:p-6` with `motion-safe:animate-pulse` shimmer blocks | full-width | none | loading | n/a |
| 4c | `<SearchError>` | SearchStates.tsx:56 | `searchState === 'error'` | `<AlertCircle size={48} className="mb-4 text-danger">` + message + "Try Again" white-pill CTA | full-width | retry button | error | n/a |
| 4d | `<NoResults>` | SearchStates.tsx:39 | `searchState === 'success' && places.length === 0` | `FeatureEmptyState` w/ `SearchX` icon + "No results found" + radius hint | full-width | none | empty (no results) | n/a |
| 5 | **Desktop side-by-side panels** | inline in LocalSupportPage.tsx:337 | `lg` breakpoint AND `(activeTab === 'search' && success && places > 0) \|\| activeTab === 'saved'` | `hidden lg:grid lg:grid-cols-2 lg:gap-6`; left scrolls, right sticky | 2-col grid | per child | populated | per child |
| 5a | **ResultsList (desktop)** | `components/local-support/ResultsList.tsx` (221 LOC) | inside left panel | sort `<select>` + filter `<select>` + card list + Load More button + filtered-empty `FeatureEmptyState` | left col, scrollable `max-h-[calc(100vh-12rem)] overflow-y-auto pr-2` | sort, filter, listing cards, share dropdown, load more | sorted / filtered / load-more / load-more-error | `sortOption`, `filterValue`, `expandedPlaceId`, `shareOpenId` |
| 5b | **ResultsMap (desktop)** | `components/local-support/ResultsMap.tsx` (136 LOC) | inside right panel | **`react-leaflet` `MapContainer`** with CARTO dark tiles. `rounded-xl border border-white/10`. Markers + popups. Wrapped in `ErrorBoundary` with `MapFallback` ("Map unavailable right now — use the list below to browse locations.") | right col, sticky `top-24 h-[calc(100vh-12rem)]` | tile pan/zoom, marker click, "View Details" in popup | normal / fallback | n/a |
| 6 | **Mobile view toggle** | inline in LocalSupportPage.tsx:376 | `lg:hidden` + same render gate as #5 | `aria-pressed` toggle buttons "List View" / "Map View" using same white-pill / muted-pill pattern as Tab bar. Below: either `<ResultsList listId="mobile">` OR `<ResultsMap>` (never both) | full-width | 2 toggle buttons + active panel | list / map | `mobileView` state |
| 7 | **Saved-tab empty** | inline in LocalSupportPage.tsx:446 | `activeTab === 'saved' && savedPlaces.length === 0` | rolls-own `<div class="flex flex-col items-center py-12 text-center">` + `<p class="text-base text-white/60">No saved {category} yet. Bookmark listings to see them here.</p>` (NOT FeatureEmptyState — inconsistent) | full-width | none | empty | bookmark state |

### Per-listing card structure (`ListingCard.tsx`, 268 LOC)

The listing card is rendered for every result inside `<ResultsList>`. Each card renders bookmark, share, optional VisitButton, and an expand toggle.

```
<article role implicit>
├── flex gap-4 photo + info row
│   ├── photo or <ImageOff> placeholder (16/20 px square)
│   └── info column
│       ├── <h3>{place.name}</h3> + distance pill (right)
│       ├── <MapPin> + address line
│       ├── <Phone> + tel link (if present)
│       └── <StarRating /> (1-5 amber-400 stars + numeric label)
├── border-t actions row
│   ├── left cluster: bookmark btn (44×44, fill-success when bookmarked) + share btn + optional VisitButton
│   └── right: expand chevron (44×44, rotates 180°)
├── <VisitNote /> textarea (if visit recorded — renders below action row, full width with `lg:max-w-[60%]`, 300 char limit, debounced auto-save)
└── expanded details (max-height + opacity transition, `inert` when collapsed)
    ├── Website link (with <ExternalLink>)
    ├── Hours of operation list
    ├── Denomination (churches) OR Specialties (counselors)
    ├── Description paragraph
    ├── "Get Directions" white-pill CTA → google.com/maps/dir
    └── <ListingCTAs /> grid (2-col on sm+) — 3 category-specific CTAs each routing to /daily?tab=pray|journal or /prayer-wall
```

---

## Part 3 — Component Dependency Tree

### Local Support component inventory

| Component | File | LOC | Used elsewhere? |
|---|---|---|---|
| `LocalSupportPage` | `components/local-support/LocalSupportPage.tsx` | 462 | only the 3 page wrappers |
| `LocalSupportHero` | `components/local-support/LocalSupportHero.tsx` | 41 | only LocalSupportPage |
| `SearchControls` | `components/local-support/SearchControls.tsx` | 215 | only LocalSupportPage |
| `ResultsList` | `components/local-support/ResultsList.tsx` | 221 | only LocalSupportPage |
| `ResultsMap` | `components/local-support/ResultsMap.tsx` | 136 | only LocalSupportPage |
| `SearchStates` (4 named exports) | `components/local-support/SearchStates.tsx` | 102 | only LocalSupportPage |
| `ListingCard` | `components/local-support/ListingCard.tsx` | 268 | only ResultsList |
| `ListingShareDropdown` (+ `tryWebShare`) | `components/local-support/ListingShareDropdown.tsx` | 224 | only ResultsList |
| `ListingCTAs` | `components/local-support/ListingCTAs.tsx` | 98 | only ListingCard |
| `VisitButton` (+ `VisitNote`, `useVisitState`) | `components/local-support/VisitButton.tsx` | 156 | only ListingCard |
| **Total Local Support code** | | **2,001** | (+ 33+35+43 = 111 page wrappers; **2,112 grand total**) |

**Test files** (`components/local-support/__tests__/`): 9 test files, **907 LOC total**.

### Two-deep dependency tree

```
LocalSupportPage
├── Navbar (shared)
├── SiteFooter (shared)
├── LocalSupportHero
│   └── GlowBackground (homepage component — center variant)
├── SearchControls
│   ├── OfflineMessage (shared, components/pwa/)
│   ├── useOnlineStatus (hook)
│   └── lucide: MapPin, Search, Loader2
├── SearchStates → SearchPrompt / NoResults / SearchError / ListingSkeleton
│   ├── FeatureEmptyState (shared, the canonical empty-state primitive)
│   └── lucide: AlertCircle, MapPin, SearchX
├── ResultsList
│   ├── FeatureEmptyState (filtered-empty)
│   ├── ListingCard
│   │   ├── VisitButton + VisitNote + useVisitState
│   │   │   ├── lib/utils → cn
│   │   │   └── services/local-visit-storage
│   │   ├── ListingCTAs
│   │   │   └── react-router-dom Link
│   │   └── lucide: Bookmark, ChevronDown, ExternalLink, ImageOff, MapPin, Phone, Share2, Star
│   ├── ListingShareDropdown (+ tryWebShare util)
│   │   ├── lucide: Copy, Mail, MessageSquare, Check (+ inline FB / X SVGs)
│   │   ├── constants/sharing → FACEBOOK_SHARE_BASE, TWITTER_SHARE_BASE
│   │   └── constants/timing → COPY_RESET_DELAY
│   └── lucide: Loader2, SearchX
├── ResultsMap
│   ├── react-leaflet → MapContainer, TileLayer, Marker, Popup, useMap
│   ├── leaflet (default marker icons rebound for Vite)
│   └── ErrorBoundary (shared, components/) with MapFallback
└── SEO (shared)

Hooks consumed
├── useAuth
├── useAuthModal (from prayer-wall AuthModalProvider)
├── useFaithPoints
├── useToast
├── useSearchParams (react-router-dom)
└── (in children) useOnlineStatus, useVisitState

Services consumed
├── createLocalSupportService → google-local-support-service OR mock-local-support-service (resolved via maps-readiness backend probe)
├── categoryToPlaceType (from local-visit-storage)
└── lib/geo → calculateDistanceMiles
```

---

## Part 4 — Unique Visual Patterns Inventory

### Hero pattern

`LocalSupportHero` is the **only logged-in inner-page hero that still uses `<GlowBackground variant="center">`**. This is a remnant of the Round 3 homepage architecture — Daily Hub migrated to `HorizonGlow`, Dashboard never used GlowBackground (it has no atmospheric layer). The hero contains:

- `<h1>` with `style={GRADIENT_TEXT_STYLE}` (the canonical white-to-purple gradient text — see `09-design-system.md` § Round 3) — class string: `mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2`
- `<p>` subtitle: `mx-auto max-w-2xl text-base leading-relaxed text-white sm:text-lg`
- Optional `extraContent` slot — used by CelebrateRecovery to render a "What is Celebrate Recovery?" frosted-mini-card: `mx-auto mt-4 max-w-2xl rounded-xl bg-white/10 px-6 py-4 text-left text-sm text-white/80 backdrop-blur-sm`
- Optional `action` slot (defined in props but never used by any consumer)

### Card chrome — rolls-own, not FrostedCard

`ListingCard.tsx:79` uses `rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow motion-reduce:transition-none sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20`. **No FrostedCard import, no DashboardCard wrapper.** Highlighted state adds `ring-2 ring-primary` (when selected from map marker click).

The skeleton in `SearchStates.tsx:81` matches the same chrome (`rounded-xl border border-white/10 bg-white/[0.06] p-5 sm:p-6`). The "Saved tab empty" rolls-own div does NOT use this chrome — it's just centered text inside `<main>`.

### White pill CTAs (Pattern 2 — homepage primary)

The hero passes through `LocalSupportHero`'s optional `action` prop. The page itself has 4 white-pill CTAs — all using the canonical Pattern 2 from `09-design-system.md`:

- "Use My Location" button (SearchControls.tsx:131)
- "Search" submit button (SearchControls.tsx:165)
- "Try Again" retry button (SearchStates.tsx:64)
- "Get Directions" link inside expanded ListingCard (ListingCard.tsx:251)

All use the same canonical class signature: `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]`.

### Tab / view toggle pattern

A consistent active/inactive pill pattern appears 3 times on the page (Tab bar lines 303-308, mobile List View toggle 382-387, mobile Map View toggle 396-401). All three use:

- Active: `bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]`
- Inactive: `bg-white/10 text-white/60 hover:bg-white/15`
- Shared chrome: `min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-base motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`

This is a **page-local pattern not yet in the design system**. If the migration extracts it, it'll be reusable in any future tabbed/segmented-control surface.

### Map chrome (Leaflet)

`ResultsMap` renders the only Leaflet map in the app. CARTO Dark Matter tile URL is hardcoded in `ResultsMap.tsx:11`. Marker icons are rebound from `leaflet/dist/images/*` for Vite bundling. The map sits inside `rounded-xl border border-white/10` with `h-[400px]` mobile / `lg:h-full` desktop. Popup styling is limited (uses inline color classes on `text-primary`).

### Form input chrome

Text input (`SearchControls.tsx:158`) and select dropdowns (`ResultsList.tsx:129, 144`) use a consistent input idiom: `rounded-lg border border-white/10 bg-white/[0.06]` (or `bg-white/[0.08]`) `px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`. The Pray/Journal **violet textarea glow** is NOT used here. The `VisitNote` textarea (VisitButton.tsx:148) shares the same idiom (slightly different focus ring opacity).

### Bookmark / Visit button affordances

- Bookmark icon: 44×44 button, icon `fill-success text-success` when active else `text-white/50`
- Visit button: when not visited, bordered `border border-white/10 text-white/50 hover:text-primary`; when visited, `text-success` no border. Below it, a slide-in textarea for the visit note.

### Range slider

Native `<input type="range">` styled with `accent-primary`. Mile markers `[1, 25, 50, 75, 100]` rendered as a row of `text-xs text-white/40` numbers below the slider — a small visual flourish unique to this page.

### Star rating

`<StarRating>` sub-component inside `ListingCard` renders 5 lucide `Star` icons. Filled = `fill-amber-400 text-amber-400`; empty = `text-white/20`. Rating numeric label `text-xs text-white/50`. Wrapped in `role="img"` with descriptive `aria-label`.

### Distance pill

Inline span in ListingCard header: `shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/50` showing `{distance.toFixed(1)} mi`.

### Share dropdown chrome (LIGHT-THEMED — anomaly)

`ListingShareDropdown.tsx:156`: the dropdown panel is **light-themed** (`bg-white py-2 border border-gray-200 shadow-lg`) with `text-text-dark` inside. This is **the only light-themed surface on a Worship Room inner page** — every other dropdown (navbar, audio drawer, share menus) uses dark theme. Likely a leftover from the pre-Round-3 light theme that was missed during the dark-theme migration. The migration spec should align this with the dark theme convention.

### Disclaimer banner

Counselors page only: `rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-200` with `role="note"`. This amber-warning chrome appears **nowhere else** in the codebase — it's a one-off pattern. Worth deciding whether to canonicalize as a `<Disclaimer>` primitive or replace with a FrostedCard variant.

---

## Part 5 — Data and Hook Dependencies

### React hooks consumed by LocalSupportPage

| Hook | Source | Purpose |
|---|---|---|
| `useState` (×11) | react | search results, coords, radius, sort, filter, selected place, active tab, mobile view, search state, page, hasMore, isLoadingMore, errorMessage, loadMoreError, bookmarkedIds (set), service |
| `useEffect` (×3) | react | resolve service factory, persist bookmarks, auto-expand deep-linked place |
| `useCallback` (×6) | react | handleSearch, handleGeocode, handleLoadMore, handleToggleBookmark, handleRetry, handleVisit |
| `useMemo` (×4) | react | initialLat/Lng/Radius from URL, savedPlaces filter, distanceMap |
| `useRef` (×1) | react | tabRefs for keyboard navigation |
| `useSearchParams` | react-router-dom | URL state for `lat`, `lng`, `radius`, `placeId` |
| `useAuth` | `@/hooks/useAuth` | `isAuthenticated` flag |
| `useAuthModal` | `@/components/prayer-wall/AuthModalProvider` | open auth modal on bookmark when logged-out |
| `useFaithPoints` | `@/hooks/useFaithPoints` | `recordActivity('localVisit', 'local_support')` on visit |
| `useToast` | `@/components/ui/Toast` | success toast on visit |

### Hooks in child components

| Hook | Source | Used by |
|---|---|---|
| `useOnlineStatus` | `@/hooks/useOnlineStatus` | SearchControls (gates search behind online check) |
| `useVisitState` | inside VisitButton.tsx (locally exported) | ListingCard |

### Service / data sources

| Service | File | Backed by |
|---|---|---|
| `createLocalSupportService` | `services/local-support-service.ts` (factory) | resolves to either `createGoogleService` (Google Places via backend proxy) or `createMockService` based on `getMapsReadiness()` probe of `/api/v1/health` |
| `mock-local-support-service` | `services/mock-local-support-service.ts` (44 LOC) | static mock data centered on `{lat: 35.6151, lng: -87.0353}` (Columbia, TN per `12-project-reference.md`) |
| `google-local-support-service` | `services/google-local-support-service.ts` (144 LOC) | calls `/api/v1/proxy/places/*` (Spec 3 of Key Protection Wave) |
| `maps-readiness` | `services/maps-readiness.ts` (46 LOC) | one-shot health probe with session caching |
| `geocode-cache` | `services/geocode-cache.ts` | client-side geocode result cache |
| `local-visit-storage` | `services/local-visit-storage.ts` (104 LOC) | wraps `wr_local_visits` localStorage; exports `getVisits`, `getVisitsByPlace`, `hasVisitedToday`, `addVisit`, `updateVisitNote`, `categoryToPlaceType` |
| `lib/geo` | `lib/geo.ts` | `calculateDistanceMiles` (Haversine formula) |

### Types

`types/local-support.ts` (43 LOC) defines:

- `LocalSupportCategory` = `'churches' | 'counselors' | 'celebrate-recovery'`
- `LocalSupportPlace` (id, name, address, phone, website, lat/lng, rating, photoUrl, description, hoursOfOperation, category, denomination, specialties)
- `SearchParams`, `SearchResult`
- `SortOption` = `'distance' | 'rating' | 'alphabetical'`
- `DENOMINATION_OPTIONS` (10 churches values)
- `SPECIALTY_OPTIONS` (8 counselor values)

---

## Part 6 — localStorage / State Inventory

### localStorage keys consumed

| Key | Read | Written | Documented in 11-local-storage-keys.md |
|---|---|---|---|
| `wr_local_visits` | `local-visit-storage.getVisits` | `addVisit`, `updateVisitNote` | ✅ documented (`LocalVisit[]` max 500) |
| `wr_bookmarks_churches` | LocalSupportPage:89 | LocalSupportPage:104 | ❌ **NOT documented** |
| `wr_bookmarks_counselors` | LocalSupportPage:89 | LocalSupportPage:104 | ❌ **NOT documented** |
| `wr_bookmarks_celebrate-recovery` | LocalSupportPage:89 | LocalSupportPage:104 | ❌ **NOT documented** |

**Documentation gap:** the dynamic `wr_bookmarks_<category>` keys (3 variants) are entirely absent from `11-local-storage-keys.md`. Any migration spec MUST include adding these to the inventory. Schema: `string[]` of place IDs, persisted only when `isAuthenticated`.

### Session/component state (not persisted)

- `service: LocalSupportService | null` — resolved once per mount
- `searchResults`, `userCoords`, `radius`, `sortOption`, `filterValue`, `selectedPlaceId`, `activeTab`, `mobileView`, `searchState`, `page`, `hasMore`, `isLoadingMore`, `errorMessage`, `loadMoreError` — search/UI state
- `bookmarkedIds: Set<string>` — local mirror; persisted only for authed users
- `expandedPlaceId`, `shareOpenId` (in ResultsList) — UI toggle state
- `locationInput`, `coordsRef`, `geoMessage`, `isGeolocating` (in SearchControls) — input state
- `visited`, `showNote`, `note`, `savedVisitId` (in VisitButton) — visit interaction state
- `copied` (in ListingShareDropdown) — clipboard feedback

### URL params

| Param | Purpose |
|---|---|
| `?lat=<float>` | seed search latitude (validated -90..90) |
| `?lng=<float>` | seed search longitude (validated -180..180) |
| `?radius=<int>` | seed radius (validated 1..500) |
| `?placeId=<string>` | auto-expand a specific listing on load (deep link target — used by ListingShareDropdown's share URLs) |

URL params are only **read on mount** (via `useMemo` with empty deps + eslint disable). The `setSearchParams` writes happen on each search to keep URL in sync with state.

---

## Part 7 — Deprecated Patterns Inventory

| Pattern | Location | Status | Replacement (per `09-design-system.md`) |
|---|---|---|---|
| `<GlowBackground variant="center">` on a non-homepage page | `LocalSupportHero.tsx:21` | DEPRECATED for inner pages (Daily Hub migrated to HorizonGlow; Dashboard never used it) | TBD — either match Daily Hub's HorizonGlow or match Dashboard's flat `bg-dashboard-dark`. Spec must decide. |
| Rolls-own card chrome instead of `FrostedCard` | `ListingCard.tsx:79`, `SearchStates.tsx:81` | inconsistent with Round 3 standard | `<FrostedCard variant="default">` |
| Light-themed dropdown on a dark page | `ListingShareDropdown.tsx:156` (`bg-white border-gray-200 shadow-lg` + `text-text-dark` items) | DEPRECATED — no other dropdown in the app uses light theme | Dark theme equivalent (e.g. `bg-hero-mid/95 backdrop-blur-md border border-white/10` matching the navbar dropdowns) |
| Rolls-own empty-state markup ("No saved … yet") | `LocalSupportPage.tsx:446-452` | inconsistent — every other empty state on the page uses `FeatureEmptyState` | `<FeatureEmptyState>` for consistency (BB-34 standard) |
| One-off amber disclaimer chrome | `LocalSupportPage.tsx:258-264` | not deprecated, but un-systematized | Either canonicalize as `<Disclaimer>` primitive or render via FrostedCard with `eyebrow="Disclaimer"` |
| Inline `text-primary` color on map popup | `ResultsMap.tsx:116, 123` | `text-primary` legacy token; design system has migrated most usages to `text-white/80` for inline links | Either keep (popup is light-themed Leaflet content) or migrate consistent with overall map redesign |
| `transition-colors` without animation token import | most CTAs use `duration-base motion-reduce:transition-none` (correct), but `transition-shadow` on ListingCard:79 has no duration token | minor — uses Tailwind default | already `transition-shadow` is fine; flagging for completeness |

**No `font-script` Caveat usages found.** No `animate-glow-pulse` usages. No deprecated cyan-glow textareas. No "What's On Your Heart" headings. Local Support is comparatively clean of the wave-7 deprecated set — the migration is mostly about chrome alignment, not deprecation removal.

---

## Part 8 — Tests Inventory

| Test file | LOC | What it covers |
|---|---|---|
| `LocalSupportPage.test.tsx` | 92 | Logged-out empty state, SearchPrompt visibility, no auth modal on idle |
| `LocalSupportHero.test.tsx` | 124 | Heading rendering, `extraContent` slot, gradient style application |
| `SearchControls.test.tsx` | 153 | Input flows, geolocation flow, radius debounce, geocode failure messages |
| `SearchControls-offline.test.tsx` | 44 | Offline-mode replacement (OfflineMessage shows instead of form) |
| `ResultsList` — no dedicated test | n/a | covered indirectly via LocalSupportPage |
| `ListingCard.test.tsx` | 229 | Card render, distance pill, expand toggle, bookmark/share/visit buttons, conditional fields |
| `ListingCTAs.test.tsx` | 76 | Category-specific CTA generation, link targets |
| `ListingShareDropdown.test.tsx` | 50 | Dropdown items, copy-to-clipboard, dismiss behaviors |
| `SearchStates.test.tsx` | 50 | All four states render correctly |
| `VisitButton.test.tsx` | 89 | Visit toggle, note autosave debounce, "Visited {date}" label |
| `services/__tests__/local-visit-storage.test.ts` | (separate) | Storage CRUD operations |
| `services/__tests__/local-support-service.test.ts` | (separate) | Factory delegation |
| `services/__tests__/maps-readiness.test.ts` | (separate) | Readiness probe caching |
| `services/__tests__/geocode-cache.test.ts` | (separate) | Geocode cache eviction |
| **Total Local Support test LOC** | **907** | (component tests only — services have separate tests) |

**Pre-existing failures** (per CLAUDE.md baseline): "logged-out mock listing cards in Local Support / Counselors / Celebrate Recovery / Churches" — 4 of the 11 documented pre-existing test failures. These tests assert that mock listings render even for logged-out users, but something about the page state currently prevents that. The migration spec should resolve these failures (either by fixing the gate, fixing the test, or documenting that the gate is intentional and the tests are obsolete).

---

## Part 9 — Accessibility Inventory

| Concern | Status | Evidence |
|---|---|---|
| Skip link | ✅ present | LocalSupportPage.tsx:241 — `<a href="#main-content">` |
| Single `<h1>` per page | ✅ present | LocalSupportHero `<h1 id={headingId}>` |
| Heading hierarchy | ✅ ListingCard uses `<h3>` for place names, hero uses `<h1>`, no h2 between (gap — could be tightened) |
| `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls` | ✅ correct on tab bar (LocalSupportPage.tsx:278-313) |
| Roving tabindex on tabs | ✅ present (Home/End/Arrow keys handled) |
| `aria-live="polite"` region for search states | ✅ LocalSupportPage.tsx:316 |
| `aria-busy` on loading skeleton | ❌ MISSING — `ListingSkeleton` uses `role="status"` + sr-only "Loading results..." but no `aria-busy` |
| `role="alert"` on errors | ✅ load-more error (`ResultsList.tsx:203`) |
| `aria-pressed` on toggle buttons | ✅ mobile view toggle, bookmark button |
| `aria-expanded` on listing card details toggle | ✅ ListingCard.tsx:172 |
| `aria-label` on icon-only buttons | ✅ bookmark, share, expand all have descriptive labels |
| `aria-disabled` on form when blocked | ✅ via `onInteractionBlocked` prop (used for future auth-gating) |
| Form labels | ✅ `htmlFor`/`id` pairs on location input, sort/filter selects, range slider |
| Disclaimer `role="note"` | ✅ LocalSupportPage.tsx:259 |
| Map fallback announcement | ✅ `role="region" aria-label="Map unavailable"` |
| Star rating semantic | ✅ wrapped in `role="img" aria-label="N out of 5 stars"`; individual stars `aria-hidden` |
| `inert` attribute on collapsed details | ✅ ListingCard.tsx:197 (`inert` when not expanded) |
| Focus restoration on dropdown close | ✅ `triggerRef.current?.focus()` in ListingShareDropdown |
| Geolocation status announced | ✅ `geoMessage` paragraph has `role="status"` |
| Color contrast: amber disclaimer text on amber bg | ⚠️ not verified — `text-amber-200` on `bg-amber-900/20` is borderline; would benefit from contrast probe |
| Color contrast: light-themed dropdown items | ✅ `text-text-dark` on `bg-white` is fine |

---

## Part 10 — Performance and Rendering

- **Lazy loading:** All three page wrappers are `React.lazy`-loaded (App.tsx:70-72). Leaflet is heavy (~150 KB gzipped) and is bundled with the page; the recon doesn't show whether `manualChunks` isolates leaflet (worth checking during the migration).
- **Distance map memoization:** `distanceMap` is computed once per `(searchResults, userCoords)` change in LocalSupportPage and passed as a prop to both `ResultsList` and `ResultsMap` — explicitly noted as "Q6 single computation" in the source comment.
- **Image lazy loading:** `<img loading="lazy">` on listing photos with onError fallback to `<ImageOff>` placeholder (ListingCard.tsx:88-100).
- **Re-render hot spots:** Sort + filter inside `ResultsList` use `useMemo` keyed correctly. `tabRefs` is a ref array (no re-render on focus moves).
- **Debounces:** Radius slider 500ms; visit note auto-save 1000ms.
- **Geolocation timeout:** 10s (SearchControls.tsx:73).
- **Map setView re-fires** on `center` change via `MapUpdater` (potential re-render storm if coords thrash; not currently an issue but worth noting).

---

## Part 11 — Cross-Cutting Concerns

### Outbound navigation

| Source | Destination |
|---|---|
| ListingCard "Get Directions" | `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` (external, new tab) |
| ListingCard website link | `place.website` (external, new tab) |
| ListingCard tel link | `tel:<phone>` |
| ListingCTAs Pray | `/daily?tab=pray&context=<encoded prompt>` |
| ListingCTAs Journal | `/daily?tab=journal&prompt=<encoded prompt>` |
| ListingCTAs CR meeting buddy | `/prayer-wall?template=cr-buddy` (Note: `?template=` doesn't appear to be consumed by Prayer Wall today — flag for verification) |
| ListingShareDropdown email | `mailto:?subject=…&body=…` |
| ListingShareDropdown SMS | `sms:?body=…` (mobile only) |
| ListingShareDropdown Facebook | `https://www.facebook.com/sharer/sharer.php?u=…` |
| ListingShareDropdown X | `https://twitter.com/intent/tweet?text=…&url=…` |

### Inbound deep links

`/local-support/<category>?placeId=<id>` — used by share dropdown and Web Share API. On load, auto-expands that listing in the results list. Requires a successful search to populate `searchResults` first, so deep links only "work" if the destination user runs the same search (or a search that includes that place).

### Activity engine integration

`recordActivity('localVisit', 'local_support')` fires on visit (LocalSupportPage.tsx:63). Maps to `+10 faith points` in the activity-points constants. The Dashboard's `activity-checklist` widget reads `wr_local_visits` directly to show "Visit local support" as completed for the day.

### Insights integration

`components/insights/CommunityConnections` reads `wr_local_visits` for the insights surface (per the test file at `frontend/src/components/insights/__tests__/CommunityConnections.test.tsx`).

### SEO + JSON-LD

Each of the 3 page wrappers ships `<SEO>` + `BreadcrumbList` JSON-LD. **All three breadcrumbs use `/local-support/churches` as the parent breadcrumb item** (Counselors.tsx:10, CelebrateRecovery.tsx:9 both link to churches as the parent). Whether intentional or a copy-paste, it's worth flagging for the spec.

---

## Part 12 — Scope Estimation and Risk Areas

### File count

- **Pages:** 3 thin wrappers (Churches, Counselors, CelebrateRecovery)
- **Components in `local-support/`:** 10 (.tsx files)
- **Tests:** 9 (.test.tsx files)
- **Services touched (read-only for migration):** 5 (local-support-service, mock + google services, maps-readiness, geocode-cache, local-visit-storage)
- **Types:** 1 (local-support.ts)

### LOC summary

| Category | LOC |
|---|---|
| Page wrappers (Churches/Counselors/CR) | 111 |
| Components (10 files) | 2,001 |
| Component tests | 907 |
| Services (read-only) | ~404 (not migration target) |
| Types (read-only) | 43 (not migration target) |
| **Total in scope for migration** | **~3,019** (pages + components + their tests) |

By comparison, Dashboard 4A/4B/4C touched 19 components at 1,000–2,500 LOC delta in three sub-specs. Local Support is roughly comparable to **one Dashboard sub-spec** in size (single-spec migration is realistic; no sub-spec split needed unless we want to separate "chrome alignment" from "auth-gate fix" which deserves its own one-shot patch anyway).

### Migration phases (suggested for the spec)

1. **Hero alignment** — decide HorizonGlow vs flat `bg-dashboard-dark` vs keep GlowBackground; apply to LocalSupportHero only.
2. **Card chrome migration** — ListingCard + ListingSkeleton from rolls-own to `<FrostedCard variant="default">`. Probably ~30 LOC delta per file; tests need class assertions updated.
3. **Tonal Icon Pattern application** — apply per-section icon colors consistent with Decision 11 (suggested: hero gradient stays; SearchControls MapPin → mint or sky; sort/filter neutral; bookmark stays success-green; visit MapPin amber; star rating already amber).
4. **Light-themed dropdown → dark-themed** — ListingShareDropdown migration. Test updates required.
5. **Saved-tab empty → FeatureEmptyState** — small consistency fix.
6. **Disclaimer chrome decision** — canonicalize or rebuild as FrostedCard.
7. **Documentation gap fix** — add `wr_bookmarks_<category>` to `11-local-storage-keys.md`.
8. **Pre-existing test failures** — decide whether to fix the 4 logged-out failing tests or document them as resolved differently.

### Risk areas

- **Leaflet re-init on chrome migration.** ResultsMap's `MapContainer` has internal lifecycle (tile loads, marker bindings). Wrapping it in any new structural element risks remount. Migration must preserve the existing wrapper structure or carefully test re-mount behavior.
- **GlowBackground decision is load-bearing.** Removing GlowBackground from LocalSupportHero will affect every screenshot for these 3 routes. Visual verification needs all 3 pages re-baselined, not just one.
- **The 3 page wrappers must stay in lockstep.** If hero changes shape, all 3 wrappers consume the same shared component — they update together. Good for cohesion; one regression breaks 3 routes simultaneously.
- **`onInteractionBlocked` prop in SearchControls** is a future-auth-gate hook (currently unused). The migration may or may not want to wire it up. If wired up, the 4 pre-existing test failures resolve naturally; if left unwired, the rule in `02-security.md` should be reworded.
- **The `?template=cr-buddy` Prayer Wall deep link** doesn't appear to be consumed by the Prayer Wall route. Either pre-Forums-Wave dead code or Forums-Wave-pending feature. Flag during spec writing.
- **Permissions-Policy `geolocation=(self)`** is set globally (Spec 1.10g security headers). Migration must NOT remove or restrict this — Local Support depends on it.
- **The Saved tab gating.** Logged-out users never see the Saved tab. If we want to support "you can browse with no friction but lose data on logout," consider whether the spec should add a session-only saved-tab path. (Currently a logged-out bookmark click triggers the auth modal — fine for MVP.)
- **Backend dependency.** Both the maps-readiness probe and (when ready=true) Google service depend on `/api/v1/health` and `/api/v1/proxy/places/*` from the Key Protection wave. Frontend-only verification with backend off will exercise the mock service path; visual fidelity in the spec must verify both code paths.

---

## Part 13 — Open Questions for Eric

1. **Hero atmosphere:** keep `GlowBackground variant="center"`, switch to `HorizonGlow` (Daily-Hub-style continuous glow), or drop to flat `bg-dashboard-dark` (Dashboard-style)? This is the single biggest visual decision and affects the page's mood.
2. **Card chrome:** migrate ListingCard to `<FrostedCard variant="default">` (consistent with Round 3) or keep the rolls-own `bg-white/[0.06]` shape (slightly tighter padding than FrostedCard's default p-6)?
3. **Tonal Icon Pattern:** which icons get tonal colors? Suggested mapping:
   - StarRating → amber (already done, keep)
   - Bookmark → emerald-300 / fuchsia-300 / cyan-300? (currently `fill-success` when active)
   - VisitButton MapPin → suggest amber-300 (warmth/courage) or violet-300 (introspection)
   - SearchControls MapPin (Use My Location) → currently bare; suggest sky-300 or emerald-300
   - Hero — no icon, just gradient text
4. **Light-themed share dropdown:** migrate to dark theme (matches every other dropdown in the app) — confirm? Test updates required (the existing tests assert `text-text-dark` class).
5. **Saved-tab empty state:** migrate to `<FeatureEmptyState>` for consistency — confirm?
6. **Disclaimer chrome:** keep one-off amber chrome, or canonicalize as a `<Disclaimer>` primitive that any page can use, or replace with FrostedCard `eyebrow="Disclaimer"`?
7. **Pre-existing test failures:** the 4 "logged-out mock listing cards" tests in the 11-failure baseline. Want them fixed in this spec or deferred?
8. **Auth-gate restoration:** `02-security.md:23` says "Local Support search" is auth-gated, but it isn't in code. Reword the rule, or wire `onInteractionBlocked` into the page so search opens auth modal? **My recommendation:** reword the rule. Forcing a logged-out user to sign in just to look up local churches is hostile and contradicts Worship Room's positioning. The current code (open search, gated bookmark + visit) is the better behavior.
9. **`wr_bookmarks_<category>` documentation:** add to `11-local-storage-keys.md` with schema "string[] of LocalSupportPlace IDs, persisted only when authenticated, 3 dynamic key variants per category" — confirm format.
10. **Leaflet bundle size:** worth checking `pnpm build` chunk output and possibly adding `manualChunks: { leaflet: ['leaflet', 'react-leaflet'] }` to vite config so map isn't shipped to non-Local-Support routes. Out of scope or in scope?
11. **Single-spec or sub-spec split?** Suggested single spec at ~3,019 LOC migration target — comparable to one Dashboard sub-spec. Confirm.

---

## Summary

**Local Support is a 3-route surface backed by one shared 462-LOC shell component plus 9 child components (~2,000 LOC total) and 9 test files (~900 LOC). It uses one Round 3 carryover (`GlowBackground`), one rolls-own card chrome, one anomalous light-themed dropdown, and consistent white-pill Pattern-2 CTAs. There are no font-script / animate-glow-pulse / cyan-glow / italic-prompt deprecated patterns. The migration scope is roughly equivalent to one Dashboard sub-spec, with the GlowBackground decision being the single most consequential choice. There is one undocumented localStorage key family (`wr_bookmarks_<category>`) and one rule/code drift (`02-security.md` says search is gated; code does not gate it) that the spec should resolve.**
