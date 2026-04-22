# Spec: Local Support Facelift + Google Places API Integration

**Scope:** All three Local Support pages — `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery` — plus the shared `LocalSupportPage`, `LocalSupportHero`, `ListingCard`, and `SearchControls` components they all render through.
**Outcome:** Visual parity with Music Round 2 and Grow facelifts (font-serif italic retired, scriptWord/Caveat retired, white pill buttons, readable phone/address contrast). Purple/white glow orb backgrounds applied via the existing `<GlowBackground>` component. Real Google Places API wiring replaces the mock data currently shipped in production — actual nearby churches, counselors, and CR groups with real photos, real phone numbers, real addresses.
**Prerequisites:** `VITE_GOOGLE_MAPS_API_KEY` is already set in `.env.local`. `requireGoogleMapsApiKey()` accessor exists in `lib/env.ts`. `GlowBackground.tsx` is already battle-tested on home page sections. No backend work required — all integration is client-side.

---

## Context

User flagged 15 issues across the three pages (5 per tab × 3 tabs) plus two cross-cutting asks (confirm Google Maps API wiring, replicate home page glowy orb). The shared-component architecture collapses most of this work into single edits that cascade to all three pages.

### Factual findings from recon (already verified)

1. **`VITE_GOOGLE_MAPS_API_KEY` is NOT currently wired.** The env var is documented in `.env.example` and set in `.env.local`, and an accessor function exists, but `createLocalSupportService()` always returns the mock service. The "Phase 2" Google service switch was never built. All 30 listings currently shown are hardcoded mock data in `local-support-mock-data.ts` — every `photoUrl` field is `null`, which is why no photos render.

2. **All three pages share the same component tree.** Churches/Counselors/CelebrateRecovery are ~25-line wrapper components that pass config to `<LocalSupportPage>`, which renders `<LocalSupportHero>`, `<SearchControls>`, `<ResultsList>` (which renders `<ListingCard>` for each place), and `<ResultsMap>`. Fixes to the shared components cascade to all three pages.

3. **`GlowBackground` is a drop-in component.** Lives at `frontend/src/components/homepage/GlowBackground.tsx`. Has `variant: 'center' | 'left' | 'right' | 'split' | 'none'` and `glowOpacity` props. Uses `animate-glow-float` (defined in `tailwind.config.js`) with `motion-reduce:animate-none`. GPU-optimized, already tested.

4. **`LocalSupportService` interface is well-defined.** Two async methods: `search(params, page)` and `geocode(query)`. The new Google service only needs to conform to this interface; `LocalSupportPage.tsx` won't need to change.

5. **`DENOMINATION_OPTIONS` and `SPECIALTY_OPTIONS` vocabularies exist** (`types/local-support.ts`:31-40). These become the keyword vocabulary for the text-match inference strategy.

### Three architecture decisions made for this spec

- **Client-side Google Places** via `@googlemaps/js-api-loader`. API key shipped to browser, restricted by HTTP referrer in Google Cloud Console. Service wrapped behind existing `LocalSupportService` interface so Phase 3 backend-proxy migration is a pure swap.
- **Denomination + specialty inference via text matching** on name + description against the existing `DENOMINATION_OPTIONS` / `SPECIALTY_OPTIONS` vocabularies. Best-effort — unmatched entries get `null` and appear in "All" view.
- **Keep Leaflet + CARTO** for map rendering. Google Places API is used only for data (nearby search, place details, photos, geocoding). Map tiles stay OpenStreetMap via CARTO dark theme. Saves a 4-6 hour refactor and ~$90/1000 daily map loads in Google pricing for zero user-visible benefit.

## Out of scope

- Backend proxy for the Google Maps API key. Phase 3 concern.
- Swapping Leaflet for Google Maps JS rendering. Keeping Leaflet.
- Place detail pages (beyond the existing expand-card). Future feature.
- Google Places Autocomplete on the location input. Current free-text geocoding is sufficient for Phase 2.
- Any Local Support feature additions (reviews, user submissions, admin tools). Visual + data wiring only.
- Photo upload or fallback image selection for places that have no Google-sourced photo.
- Pagination beyond Google Places' `next_page_token` (max 60 results total per Google's own cap — 3 pages of 20). Results beyond that tier are not accessible without a different approach.
- Faith Points "localVisit" recording logic changes. Existing `handleVisit` callback stays as-is.

---

## Prerequisites

### Packages to install

```bash
pnpm add @googlemaps/js-api-loader@^1.16.8
```

Only one new package. No other Google Maps packages needed — we're only using the JS API loader for script injection, then hitting Places API via REST.

### Files modified

| Path | Change |
|---|---|
| `frontend/src/components/local-support/LocalSupportHero.tsx` | Wrap hero content in `<GlowBackground variant="center">`. Remove `font-serif italic text-white/60` subtitle; use `text-white`. Remove `scriptWord` wrapping (no more Caveat accent). |
| `frontend/src/pages/Churches.tsx` | Remove `scriptWord: 'Church'` from config |
| `frontend/src/pages/Counselors.tsx` | Remove `scriptWord: 'Counselor'` from config |
| `frontend/src/pages/CelebrateRecovery.tsx` | Remove `scriptWord: 'Recovery'` from config |
| `frontend/src/components/local-support/SearchControls.tsx` | Invert "Use My Location" button and "Search" button — white background, primary text |
| `frontend/src/components/local-support/LocalSupportPage.tsx` | Invert active-state "Search Results" / "Saved" tab button (white bg, primary text). Wire `createLocalSupportService()` factory to select Google service when key present (see §3.1 below). |
| `frontend/src/components/local-support/ListingCard.tsx` | Phone number `text-primary` → `text-white` (keep underline on hover for affordance). Address `text-white/60` → `text-white`. Extend photo area to work with photoUrl on all screens (not just `sm:block`). |
| `frontend/src/services/local-support-service.ts` | Switch factory: return Google service when key is configured, mock service as fallback. |

### Files created

| Path | Purpose |
|---|---|
| `frontend/src/services/google-local-support-service.ts` | Real Google Places API implementation of `LocalSupportService`. Conforms to existing interface. |
| `frontend/src/services/google-places-mapper.ts` | Maps Google Places API response shape → `LocalSupportPlace`. Includes denomination/specialty text-match inference. |
| `frontend/src/services/geocode-cache.ts` | In-memory Map-based cache for geocoded location strings. Reduces repeat API calls during a single session. |
| `frontend/src/services/__tests__/google-places-mapper.test.ts` | Tests for the mapper, especially the denomination/specialty text-match logic. |

---

# Part 1: Visual Cleanup (shared components)

## 1.1 Hero subtitle — remove italic serif

**User ask (all three tabs):** "[Subtitle] needs to be white and not in italics."
**Root cause:** `LocalSupportHero.tsx:32` hardcodes `font-serif italic text-base leading-relaxed text-white/60`.

### Change

**File:** `frontend/src/components/local-support/LocalSupportHero.tsx`

```tsx
// Before
<p className="mx-auto max-w-2xl font-serif italic text-base leading-relaxed text-white/60 sm:text-lg">
  {subtitle}
</p>

// After
<p className="mx-auto max-w-2xl text-base leading-relaxed text-white sm:text-lg">
  {subtitle}
</p>
```

### Acceptance

- Subtitle on all three pages renders in Inter (not Lora), non-italic, solid white.
- Matches the Music Round 2 PageHero subtitle treatment.

---

## 1.2 Hero title — remove scriptWord / Caveat accent

**User ask (all three tabs):** "The 'church'/'counselor'/'recovery' font in [heading] doesn't match the rest of the line. Fix."
**Root cause:** Each page passes a `scriptWord` prop. `renderWithScriptAccent(title, scriptWord)` wraps that word in `<span className="font-script">...</span>` (Caveat), which doesn't match the gradient Inter of the rest of the heading. Same anti-pattern we retired from Grow and Music heroes.

### Change

**Three-file coordinated edit.** All three config files drop the `scriptWord` prop; the `LocalSupportHero` doesn't need to change (it already no-ops when `scriptWord` is undefined via `renderWithScriptAccent`).

**File:** `frontend/src/pages/Churches.tsx`

```tsx
// Before
config={{
  category: 'churches',
  headingId: 'churches-heading',
  title: 'Find a Church Near You',
  scriptWord: 'Church',  // <-- remove
  subtitle: '...',
  ...
}}

// After
config={{
  category: 'churches',
  headingId: 'churches-heading',
  title: 'Find a Church Near You',
  subtitle: '...',
  ...
}}
```

**File:** `frontend/src/pages/Counselors.tsx` — same treatment, remove `scriptWord: 'Counselor'`.

**File:** `frontend/src/pages/CelebrateRecovery.tsx` — same treatment, remove `scriptWord: 'Recovery'`.

### Optional: prune the prop from the interface

`LocalSupportHero.tsx` and `LocalSupportPageConfig` both still declare `scriptWord?: string` as an optional prop. Once no consumer uses it, the prop is dead code. Decision for the executor: leave the prop in for now (no harm, potential future use) OR remove it for cleanliness. **Preferred: remove it.** `renderWithScriptAccent` is already used by `<PageHero>` for other pages — that's where the abstraction belongs.

If removing: delete `scriptWord?: string` from both the `LocalSupportPageConfig` interface and the `LocalSupportHeroProps` interface, and remove the `scriptWord` parameter from the `LocalSupportHero` render. Simplify the h1 to `{title}` instead of `{renderWithScriptAccent(title, scriptWord)}`.

### Acceptance

- "Find a Church Near You" / "Find a Christian Counselor" / "Find Celebrate Recovery" all render in uniform gradient Inter — no Caveat script on any word.
- Visual weight matches `/music`, `/grow`, `/daily` heroes.

---

## 1.3 Hero orb background

**User ask:** "Can you replicate the purple/white glowy orb design we have on the home page with the three local support pages?"
**Approach:** Use the existing `<GlowBackground variant="center">` component. Wraps the hero region; delivers two animated radial-gradient orbs (primary violet at top-center-ish, lighter violet at 60%/80%) with `animate-glow-float` (20s) and `motion-reduce:animate-none`.

### Change

**File:** `frontend/src/components/local-support/LocalSupportHero.tsx`

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

### Notes

- Key swap: `style={ATMOSPHERIC_HERO_BG}` (the radial gradient that was there) is REMOVED. `<GlowBackground>` now owns the background treatment. Background color is `bg-hero-bg` (applied by `GlowBackground` wrapper).
- `ATMOSPHERIC_HERO_BG` import is also removed since nothing in this file references it anymore. Leave the export in `PageHero.tsx` — other pages still use it.
- `renderWithScriptAccent` import is removed (§1.2 eliminates its use here).
- The `<section>` stays inside `<GlowBackground>`'s `{children}` slot — a11y landmarks preserved.

### Acceptance

- All three Local Support pages render with two animated violet orbs floating behind the hero (primary at top-center-ish, secondary at mid-right).
- Orbs use `will-change-transform` and `blur-[60px] md:blur-[80px]` (from `GlowBackground`'s canonical config).
- `prefers-reduced-motion: reduce` pauses the float animation (via `motion-reduce:animate-none` baked into `GlowBackground`).
- Orbs are `pointer-events-none` and `aria-hidden="true"` (both baked into `GlowBackground`).
- Hero content (h1, subtitle, extraContent, action) remains on `z-10`, above the orbs.
- No layout shift compared to pre-change: orbs are absolutely positioned inside the relative wrapper, don't affect flow.

### Cross-page impact

`LocalSupportHero` is used ONLY by `LocalSupportPage`, which is used ONLY by Churches, Counselors, and CelebrateRecovery. Zero impact on other pages.

---

## 1.4 "Use My Location" + "Search" button inversion

**User ask (all three tabs):** "Invert the colors in 'Use my location' button and 'Search' button to have purple font and white background."
**Root cause:** `SearchControls.tsx` lines 136 and 173 use `bg-primary ... text-white`. Need the opposite — matches the white-pill treatment established in Grow and Music specs.

### Change

**File:** `frontend/src/components/local-support/SearchControls.tsx`

**"Use My Location" button (line ~131-146):**

```tsx
// Before
<button
  type="button"
  onClick={onInteractionBlocked ?? handleUseMyLocation}
  disabled={isGeolocating}
  aria-label="Use my current location"
  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-lt disabled:opacity-50"
>

// After
<button
  type="button"
  onClick={onInteractionBlocked ?? handleUseMyLocation}
  disabled={isGeolocating}
  aria-label="Use my current location"
  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50"
>
```

**"Search" submit button (line ~166-176):**

```tsx
// Before
<button
  type="submit"
  disabled={isLoading || !locationInput.trim()}
  aria-label="Search"
  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-lt disabled:opacity-50"
>

// After
<button
  type="submit"
  disabled={isLoading || !locationInput.trim()}
  aria-label="Search"
  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50"
>
```

### Notes

- `rounded-lg` → `rounded-full` for pill shape consistency with the rest of the site's white CTAs.
- `px-4` → `px-6` tightens horizontal padding to pill-standard.
- `font-medium` → `font-semibold` for white-on-dark readability boost.
- Subtle white glow shadow (`shadow-[0_0_20px_rgba(255,255,255,0.15)]`) gives the inverted buttons visual weight on the dark background — matches TonightScripture's 48px play button from Music Round 1.
- Hover state goes `gray-100` (slightly darker white) matching existing white-pill pattern.
- `disabled:opacity-50` preserved — disabled state visible.
- `aria-label` strings unchanged — pure visual refactor.

### Acceptance

- Both buttons render white background with `text-primary` (#6D28D9) foreground.
- Subtle white glow halo visible against dark page background.
- Hover darkens slightly.
- Disabled state retains 50% opacity and cursor-not-allowed.
- Loader icon (`Loader2` for "Use My Location" when `isGeolocating`) inherits `text-primary` color correctly.

---

## 1.5 "Search Results" / "Saved" tab button inversion

**User ask:** "Invert the colors in ... 'Search results' button to have purple font and white background."
**Root cause:** `LocalSupportPage.tsx` lines ~249-253 use `bg-primary/20 text-white` for the ACTIVE tab state. User wants the active tab to be white-pill like other site buttons.

### Change

**File:** `frontend/src/components/local-support/LocalSupportPage.tsx`

```tsx
// Before (inside the tab map, lines ~235-254)
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

### Notes

- Inactive tab state stays the same (muted ghost button) — the contrast between active-white-pill and inactive-muted-ghost is the whole point of the tab affordance.
- `font-medium` → `font-semibold` for active white-on-dark readability.
- Also apply the matching treatment to the mobile "List View" / "Map View" toggle buttons (same file, same component, lines ~303-326) for consistency.

### Mobile List/Map toggle (same file, ~lines 303-326)

```tsx
// Before — active state
activeTab === 'list' ? 'bg-primary/20 text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'
activeTab === 'map'  ? 'bg-primary/20 text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'

// Wait — the variable names above use mobileView, not activeTab. Look at the actual code:
mobileView === 'list' ? 'bg-primary/20 text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'
mobileView === 'map'  ? 'bg-primary/20 text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'

// After (for both)
mobileView === 'list' ? 'bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'bg-white/10 text-white/60 hover:bg-white/15'
mobileView === 'map'  ? 'bg-white text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'bg-white/10 text-white/60 hover:bg-white/15'
```

### Acceptance

- Active "Search Results" / "Saved" tab renders white background, `text-primary` (#6D28D9) foreground, subtle glow halo.
- Inactive tabs stay muted ghost.
- Mobile List/Map view toggle matches the same pattern.
- All buttons on the page that use white-pill active state visually match each other (SearchControls inputs, tab buttons, mobile view toggles).

---

## 1.6 ListingCard — phone + address contrast fix

**User ask (all three tabs):** "The purple phone numbers are hard to read. Change all purple font to white. And change all addresses to white as well (they're grey)."
**Root cause:** `ListingCard.tsx:116` uses `text-primary` for phone anchor. Line 109 uses `text-white/60` for address paragraph. Both fail user-legibility even if technically WCAG AA.

### Change

**File:** `frontend/src/components/local-support/ListingCard.tsx`

**Address (line ~107-110):**

```tsx
// Before
<p className="mt-1 flex items-center gap-1 text-sm text-white/60">
  <MapPin size={14} className="shrink-0" aria-hidden="true" />
  {place.address}
</p>

// After
<p className="mt-1 flex items-center gap-1 text-sm text-white">
  <MapPin size={14} className="shrink-0 text-white/70" aria-hidden="true" />
  {place.address}
</p>
```

Notes: The MapPin icon gets `text-white/70` (slightly muted) so it's visually subordinate to the address text, which is now full white. If both are full white they fight for attention — icon as decoration, text as content, icon slightly dimmed.

**Phone (line ~114-124):**

```tsx
// Before
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

// After
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

Notes:
- Anchor color: `text-primary` → `text-white`. Hover underline preserved for affordance.
- Focus ring: `focus:ring-2 focus:ring-primary` → `focus:ring-2 focus:ring-primary-lt`. Matches the rest of the site.

### Additional pass on other `text-primary` occurrences in this file

Check the expanded-details section for other `text-primary` small-text usages that should shift to white. Known instance: "Visit Website" anchor at line ~185 uses `text-primary`. Keep this one — it's a call to action (not info text) and the expanded panel already has enough visual hierarchy. But for the "Get Directions" CTA at the bottom which uses `bg-primary/10 text-primary`, upgrade to the canonical white-pill pattern:

```tsx
// Before
<a
  href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
>
  <MapPin size={14} aria-hidden="true" />
  Get Directions
</a>

// After
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

### Acceptance

- Phone numbers render in solid white; underline on hover.
- Addresses render in solid white; MapPin icon is `text-white/70` (muted but visible).
- "Get Directions" CTA is a white pill matching the rest of the site.
- Focus rings use `ring-primary-lt` consistently.
- All address + phone accessibility preserved (tel: link intact, address is plain text for screen reader).

---

## 1.7 ListingCard photo — ensure it renders when photoUrl exists

**User ask (all three tabs):** "None of the pictures are showing up to the left of the cards."
**Root cause (two-part):**
1. All mock data has `photoUrl: null`. The code at line 83-97 correctly falls back to `<ImageOff>` icon when photoUrl is null. This is why no photos show today.
2. Once Google Places integration lands (§3), photos will populate. But the photo block is wrapped in `<div className="hidden shrink-0 sm:block">` — it's HIDDEN on mobile. User viewing on phone will never see photos.

### Change

**File:** `frontend/src/components/local-support/ListingCard.tsx` (lines ~82-98)

```tsx
// Before
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

// After
<div className="shrink-0">
  {place.photoUrl ? (
    <img
      src={place.photoUrl}
      alt={`Photo of ${place.name}`}
      className="h-16 w-16 rounded-lg object-cover sm:h-20 sm:w-20"
      loading="lazy"
      onError={(e) => {
        // Graceful degradation if Google photo URL expires or 403s
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

### Notes

- Removed `hidden ... sm:block`. Photo now visible at all breakpoints.
- Added responsive sizing: 64x64 on mobile, 80x80 on tablet+. Smaller photos on mobile keep card layout tight.
- Added `onError` handler on the `<img>` tag. Google Photo URLs can expire or 403 occasionally; this hides the broken image rather than showing the browser's default broken-image icon.
- Icon sizing is responsive too (20px mobile, 24px tablet+).
- `loading="lazy"` preserved.

### Acceptance

- At 375px viewport: photo (or placeholder) visible at 64x64 on the left of each card.
- At 640px+: photo visible at 80x80.
- When Google Photos populates real URLs, images render in place of the `ImageOff` placeholder.
- If a Google Photo URL fails to load, the image element self-hides (no broken image icon).

---

# Part 2: GlowBackground Integration

Already covered in §1.3 above. No standalone step — applying `<GlowBackground>` is a 3-line change inside `LocalSupportHero.tsx`.

---

# Part 3: Google Places API Wiring

## 3.1 Service factory: wire the switch

**File:** `frontend/src/services/local-support-service.ts`

```tsx
// Before
import type { SearchParams, SearchResult } from '@/types/local-support'
import { createMockService } from './mock-local-support-service'

export interface LocalSupportService {
  search(params: SearchParams, page: number): Promise<SearchResult>
  geocode(query: string): Promise<{ lat: number; lng: number } | null>
}

export function createLocalSupportService(): LocalSupportService {
  // Phase 2: check for Google API key and return Google service if available
  return createMockService()
}

// After
import type { SearchParams, SearchResult } from '@/types/local-support'
import { isGoogleMapsApiKeyConfigured } from '@/lib/env'
import { createMockService } from './mock-local-support-service'
import { createGoogleService } from './google-local-support-service'

export interface LocalSupportService {
  search(params: SearchParams, page: number): Promise<SearchResult>
  geocode(query: string): Promise<{ lat: number; lng: number } | null>
}

/**
 * Factory returns the Google Places implementation when an API key is configured
 * in the environment, otherwise falls back to the mock service.
 *
 * This allows:
 * - Local dev without a key: mock data works out of the box
 * - Production with a key: real Google Places API data
 * - Tests without a key: mock data (deterministic, no network)
 * - Phase 3: swap createGoogleService for createBackendProxyService with zero UI change
 */
export function createLocalSupportService(): LocalSupportService {
  if (isGoogleMapsApiKeyConfigured()) {
    return createGoogleService()
  }
  return createMockService()
}
```

### Acceptance

- In local dev with `VITE_GOOGLE_MAPS_API_KEY` set: real Google service is returned.
- In test environments (no key): mock service is returned; all existing mock-data tests still pass unchanged.
- In production with key: real service.
- Service instance is created once per page load (as it is today, via module-level `const service = createLocalSupportService()` in `LocalSupportPage.tsx:47`).

---

## 3.2 Google Places mapper

**File (new):** `frontend/src/services/google-places-mapper.ts`

Purpose: convert raw Google Places API response objects into the `LocalSupportPlace` shape the app expects. Inference logic for denomination + specialties lives here.

```tsx
import type { LocalSupportPlace, LocalSupportCategory } from '@/types/local-support'
import { DENOMINATION_OPTIONS, SPECIALTY_OPTIONS } from '@/types/local-support'

/**
 * Raw shape of Google Places API (New) v1 Place object.
 * Only fields we actually use are typed. See:
 * https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places
 */
export interface GooglePlace {
  id: string
  displayName?: { text: string; languageCode?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  location: { latitude: number; longitude: number }
  rating?: number
  photos?: Array<{
    name: string  // resource name like "places/{place_id}/photos/{photo_reference}"
    widthPx?: number
    heightPx?: number
  }>
  editorialSummary?: { text: string; languageCode?: string }
  regularOpeningHours?: {
    weekdayDescriptions?: string[]
  }
  types?: string[]
  businessStatus?: 'BUSINESS_STATUS_UNSPECIFIED' | 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY'
}

/**
 * Build a photo URL from Google Places photo resource name.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/place-photos
 *
 * Photos are fetched as a ~400px-wide media URL. The key is included because the
 * Places API Photo endpoint requires it as a query param.
 */
export function buildPhotoUrl(photoName: string, apiKey: string, maxWidthPx = 400): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${encodeURIComponent(apiKey)}`
}

/**
 * Infer denomination from a church's name + description using the canonical
 * DENOMINATION_OPTIONS vocabulary. Returns null if no match.
 *
 * Inference strategy:
 * - Lowercase scan for each canonical denomination word as a whole-ish substring
 * - "Church of Christ" tested before "Christ"-only patterns
 * - "Non-denominational" matched via "non-denominational" OR "nondenominational"
 * - Most specific match wins (e.g., "Southern Baptist" → "Baptist")
 */
export function inferDenomination(name: string, description: string | null): string | null {
  const haystack = `${name} ${description ?? ''}`.toLowerCase()

  // Ordered so specific matches checked first
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
      // Verify canonical is in the allowed vocabulary
      if ((DENOMINATION_OPTIONS as readonly string[]).includes(canonical)) {
        return canonical
      }
    }
  }

  return null
}

/**
 * Infer counselor specialties from name + description. Returns up to 3 specialties
 * (most Google descriptions don't mention more cleanly).
 */
export function inferSpecialties(name: string, description: string | null): string[] | null {
  const haystack = `${name} ${description ?? ''}`.toLowerCase()
  const matches: string[] = []

  const patterns: Array<[string, RegExp]> = [
    ['Grief', /\b(grief|bereavement|loss)\b/],
    ['Anxiety', /\banxiet/],  // matches "anxiety", "anxieties"
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

  // If no specific specialty matched, default to 'General'
  if (matches.length === 0) {
    return ['General']
  }

  return matches.slice(0, 3)
}

/**
 * Convert a Google Place response into our internal LocalSupportPlace shape.
 * Filters out places that are closed_permanently or lack essential data.
 */
export function mapGooglePlaceToLocalSupport(
  gp: GooglePlace,
  category: LocalSupportCategory,
  apiKey: string,
): LocalSupportPlace | null {
  // Filter: skip places missing name or location
  if (!gp.displayName?.text || !gp.location) return null

  // Filter: skip closed-permanently places
  if (gp.businessStatus === 'CLOSED_PERMANENTLY') return null

  const name = gp.displayName.text
  const description = gp.editorialSummary?.text ?? null
  const photoUrl = gp.photos?.[0]?.name
    ? buildPhotoUrl(gp.photos[0].name, apiKey)
    : null

  const denomination = category === 'churches'
    ? inferDenomination(name, description)
    : null
  const specialties = category === 'counselors'
    ? inferSpecialties(name, description)
    : null

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

### Test coverage

**File (new):** `frontend/src/services/__tests__/google-places-mapper.test.ts`

Required test cases:
- `inferDenomination('First Baptist Church of Columbia', null)` → `'Baptist'`
- `inferDenomination('St. Catherine of Siena Catholic Church', null)` → `'Catholic'`
- `inferDenomination('The Crossing Community Church', null)` → `null` (no match)
- `inferDenomination('The Crossing', 'A non-denominational church with dynamic worship')` → `'Non-denominational'`
- `inferDenomination('Riverside Church of Christ', null)` → `'Church of Christ'`
- `inferDenomination('Grace Lutheran Church of Columbia', null)` → `'Lutheran'` (Church of Christ check doesn't misfire)
- `inferSpecialties('Hope Renewed — Grief Counseling', null)` → `['Grief']`
- `inferSpecialties('Marriage & Family Therapy', 'Anxiety and depression treatment.')` → `['Anxiety', 'Depression', 'Marriage']` (first 3)
- `inferSpecialties('Generic Counseling Center', null)` → `['General']`
- `mapGooglePlaceToLocalSupport(...)` with a `CLOSED_PERMANENTLY` status → `null`
- `mapGooglePlaceToLocalSupport(...)` with missing `displayName` → `null`
- `mapGooglePlaceToLocalSupport(...)` happy path → full `LocalSupportPlace` with photoUrl, inference fields, etc.

---

## 3.3 Geocode cache

**File (new):** `frontend/src/services/geocode-cache.ts`

Purpose: prevent repeat Geocoding API calls for the same search string within a session. Geocoding is the most expensive per-call endpoint in the Places/Geocoding ecosystem; a user searching "Columbia TN" three times shouldn't hit the API three times.

```tsx
interface CachedGeocode {
  coords: { lat: number; lng: number } | null
  timestamp: number
}

/**
 * In-memory LRU-ish cache for geocode results. Keyed by lowercased trimmed query.
 * Entries live for the session (no localStorage — geocode results can change slowly
 * but tying them to a session boundary keeps things fresh).
 *
 * Max size: 50 entries. When full, the oldest entry is evicted.
 */
class GeocodeCache {
  private cache = new Map<string, CachedGeocode>()
  private readonly MAX_SIZE = 50

  get(query: string): { lat: number; lng: number } | null | undefined {
    const key = this.keyFor(query)
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Re-insert to refresh recency for LRU
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.coords
  }

  set(query: string, coords: { lat: number; lng: number } | null): void {
    const key = this.keyFor(query)

    if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
      // Evict oldest (first in Map iteration order)
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

Simple LRU. No persistence. Covers the common case (user retyping same city name, or URL-deep-linking and then re-searching).

---

## 3.4 Google service implementation

**File (new):** `frontend/src/services/google-local-support-service.ts`

This is the big one. Implements `LocalSupportService` using Google Places API (New) v1 REST endpoints. Handles pagination via `next_page_token`, caches geocode results, maps responses through `mapGooglePlaceToLocalSupport`.

```tsx
import type { SearchParams, SearchResult, LocalSupportCategory } from '@/types/local-support'
import type { LocalSupportService } from './local-support-service'
import { requireGoogleMapsApiKey } from '@/lib/env'
import { mapGooglePlaceToLocalSupport, type GooglePlace } from './google-places-mapper'
import { geocodeCache } from './geocode-cache'

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

// Fields to request from Places API. We only ask for what we need (billing optimization).
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

/**
 * Pagination token cache. Keyed by a stable hash of search params.
 * The cache lets us paginate without re-issuing the whole search.
 */
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

    // For page 0, start fresh; for later pages, use stored next_page_token
    let pageToken: string | null | undefined = undefined
    if (page > 0) {
      pageToken = paginationTokens.get(cacheKey)
      if (!pageToken) {
        // No token available — either exhausted or first-page wasn't called
        return { places: [], hasMore: false }
      }
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

    if (pageToken) {
      body.pageToken = pageToken
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': `${REQUESTED_FIELDS},nextPageToken`,
    }

    const response = await fetchWithTimeout(PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers,
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

    // Store pagination token (or null if no more pages)
    paginationTokens.set(cacheKey, data.nextPageToken ?? null)

    return {
      places,
      hasMore: Boolean(data.nextPageToken),
    }
  }

  async geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    const cached = geocodeCache.get(query)
    if (cached !== undefined) {
      return cached  // Cache hit — could be coords or null (negative cache)
    }

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
      // Negative-cache the result so repeat queries don't retry
      geocodeCache.set(query, null)
      return null
    }

    const coords = data.results[0].geometry.location
    geocodeCache.set(query, coords)
    return coords
  }
}

function milesToMeters(miles: number): number {
  return miles * 1609.344
}

export function createGoogleService(): LocalSupportService {
  return new GoogleLocalSupportService()
}
```

### Notes on the implementation

- **Uses Places API (New) v1** with `searchText` endpoint. The `textQuery` accepts the same keywords as the mock service ("church", "Christian counselor", "Celebrate Recovery"), plus `locationBias` circle parameters. This matches existing `mock-local-support-service.ts` behavior.
- **Field mask via `X-Goog-FieldMask`** header restricts response to only fields we use. This is a billing requirement — Google charges per-field-group, and including every field triples the per-request cost.
- **Pagination token caching** is module-level (`paginationTokens` Map). Persists across calls within a page load. Each unique (lat, lng, radius, keyword) combination gets its own token chain.
- **Negative geocode caching** (store `null` for failed queries) prevents hammering Geocoding API on user typos.
- **10-second timeout** via AbortController. If Google is slow, app gives up gracefully and the existing error-state UI shows.
- **Error shape** is plain `throw new Error(...)` — caller's try/catch in `LocalSupportPage.tsx:handleSearch` already handles it via `setSearchState('error')`.
- **Photo URL construction** is delegated to `buildPhotoUrl()` in the mapper. API key is embedded in photo URLs as a query param; Google's CDN enforces referrer restrictions. This is the documented, supported pattern.

### Next-page-token settle delay

Google's `nextPageToken` requires a 1-2 second delay after being returned before it validates. In practice, the user clicking "Load More" takes long enough that this isn't an issue. If it becomes one (tests show `INVALID_REQUEST` on rapid Load More clicks), add a 1-second `setTimeout` wait in the service before issuing the next-page request. Not adding now — premature optimization.

### API key security note

The key is shipped to the browser. Security model depends on:
1. **HTTP referrer restrictions** configured in Google Cloud Console (limit to `worshiproom.com`, `localhost`). Without this, anyone can copy the key and use it on their own domain, running up your bill.
2. **API restrictions**: restrict the key to only Places API (New), Geocoding API, and Maps JavaScript API (if we use it — we don't, so leave it off). Don't enable billing-heavy APIs we're not using.
3. **Monthly budget alert** in Google Cloud Console at ~$50 or your chosen threshold.

**Acceptance for this spec:** the key works for local dev. Production HTTP referrer restrictions must be set before production deploy (separate operational checklist, not code).

---

## 3.5 Mock service preservation

**File:** `frontend/src/services/mock-local-support-service.ts` — no changes.

The mock service stays untouched. It's now the fallback when no API key is configured (useful for CI, tests, and new dev setups). The factory in §3.1 handles the switch.

---

# Part 4: Verification Checklist

## Visual regression (Playwright)

Run `/verify-with-playwright` on all three routes at 1440px and 375px:

- `/local-support/churches`
- `/local-support/counselors`
- `/local-support/celebrate-recovery`

Tolerance: ±2px. Expected matches:

- Hero title: no `.font-script` descendants, full gradient Inter
- Hero subtitle: `rgb(255, 255, 255)`, `font-style: normal`, `font-family: Inter, ...`
- GlowBackground: 2 `[data-testid="glow-orb"]` divs present, `pointer-events: none`, `animation: glow-float 20s ...`
- "Use My Location" button: `bg: rgb(255, 255, 255)`, `color: rgb(109, 40, 217)` (primary)
- "Search" button: same colors as above
- "Search Results" active tab: same colors
- Phone anchor: `color: rgb(255, 255, 255)`
- Address paragraph: `color: rgb(255, 255, 255)`
- "Get Directions" CTA: white pill

## API integration verification (manual — requires live Google Places)

With `VITE_GOOGLE_MAPS_API_KEY` set:

1. Load `/local-support/churches`. Confirm:
   - Page renders without console errors
   - "Search Results" is initially empty (logged-out initial state moved from mock to idle)
   - Click "Use My Location" (grant permission). Confirm real nearby churches load.
   - At least some churches have photos (not all will — Google Places photos are uneven coverage).
   - At least some churches have a denomination inferred correctly (check cards for "Baptist", "Catholic", "Methodist" labels in the expanded view).
2. Load `/local-support/counselors`. Same workflow. Confirm real counseling centers appear, and at least some have specialty labels inferred.
3. Load `/local-support/celebrate-recovery`. Same workflow. Confirm real CR groups appear.
4. Test geocoding: type "Nashville TN" in the location input. Confirm results centered on Nashville.
5. Test pagination: click "Load More" (if offered). Confirm next batch of results appears.
6. Test error handling: temporarily invalidate the API key, reload, search. Confirm the existing `SearchError` state renders cleanly.
7. Test offline: disable network. Confirm existing `OfflineMessage` shows.

## Test updates required

- `frontend/src/services/__tests__/google-places-mapper.test.ts` — new file (see §3.2)
- `frontend/src/components/local-support/__tests__/LocalSupportHero.test.tsx` — update to assert:
  - No `font-serif` class
  - No `italic` class
  - Subtitle color is white (not `/60`)
  - `GlowBackground` is rendered as ancestor (presence of `[data-testid="glow-orb"]`)
  - No Caveat script in the h1
- `frontend/src/components/local-support/__tests__/SearchControls.test.tsx` — update button color assertions
- `frontend/src/components/local-support/__tests__/ListingCard.test.tsx` — update phone/address color assertions
- Existing `ResultsMap.test.tsx` — no change

## Accessibility

- `/local-support/churches?` — Lighthouse Accessibility ≥ 95
- axe DevTools sweep on all three pages
- Focus ring color on new white-pill buttons: `ring-primary-lt` passes AA on dark bg

---

# Part 5: Acceptance Summary

This spec is complete when:

1. ✅ All three pages render with `<GlowBackground variant="center">` around their hero region.
2. ✅ Hero h1 on all three pages renders in uniform gradient Inter — no Caveat accent.
3. ✅ Hero subtitle on all three pages renders in Inter non-italic solid white.
4. ✅ "Use My Location", "Search", "Search Results" tab active state, and mobile List/Map toggle active states all render as white pill with `text-primary` foreground.
5. ✅ Phone numbers on all listing cards render in solid white with hover underline.
6. ✅ Addresses on all listing cards render in solid white with dimmed MapPin icon.
7. ✅ "Get Directions" CTA in expanded details renders as white pill.
8. ✅ Listing photo area visible at all breakpoints (not hidden on mobile).
9. ✅ `createLocalSupportService()` returns Google service when `VITE_GOOGLE_MAPS_API_KEY` is configured.
10. ✅ Google service conforms to existing `LocalSupportService` interface.
11. ✅ Real Google Places data populates all three pages when the key is configured.
12. ✅ Photos render from Google Places where available; graceful fallback to `ImageOff` placeholder where not.
13. ✅ Denomination inference produces correct labels for at least 70% of tested church results.
14. ✅ Specialty inference produces at least one meaningful label for at least 60% of tested counselor results; remaining fall back to `['General']`.
15. ✅ Geocoding uses Google Geocoding API; repeat searches within a session hit the in-memory cache.
16. ✅ Pagination via `nextPageToken` works for at least 2 pages when enough nearby results exist.
17. ✅ Error states (API failure, no results, offline) continue to render correctly.
18. ✅ Tests pass for new google-places-mapper unit tests.
19. ✅ Playwright verification passes on all three routes at 1440px and 375px.
20. ✅ Lighthouse Accessibility ≥ 95 on `/local-support/churches`.

---

## Change summary for `/code-review`

**Files created (4):** `google-local-support-service.ts`, `google-places-mapper.ts`, `geocode-cache.ts`, `google-places-mapper.test.ts`
**Files modified (8):** `LocalSupportHero.tsx`, `Churches.tsx`, `Counselors.tsx`, `CelebrateRecovery.tsx`, `SearchControls.tsx`, `LocalSupportPage.tsx`, `ListingCard.tsx`, `local-support-service.ts`

**Packages added (1):** `@googlemaps/js-api-loader@^1.16.8` (note: the spec above uses raw `fetch()` directly; the loader isn't strictly required unless we later add Maps JS. Keep it off the dependency list and drop this line if `fetch` is the chosen approach. Decision for executor: only install if actually imported.)

**Patterns introduced:** Google Places API integration via REST with field mask + pagination token caching. Text-match inference for denomination/specialty from name + description. Session-scoped in-memory geocode cache. `<GlowBackground>` usage on a non-home page.

**Patterns retired:** `scriptWord` / `renderWithScriptAccent` on Local Support pages. `font-serif italic` subtitle. `bg-primary text-white` on primary CTAs (replaced with white pill). `text-primary` on phone numbers.

**Known follow-ups:** Backend proxy for the Google Maps API key (Phase 3). Google Places Autocomplete on the location input (better UX). Place detail pages. Review UGC. Production HTTP referrer restrictions + monthly budget alerts in Google Cloud Console (operational, not code).
