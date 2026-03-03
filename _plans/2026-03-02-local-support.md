# Implementation Plan: Local Support — Churches, Counselors & Celebrate Recovery

**Spec:** `_specs/local-support.md`
**Date:** 2026-03-02
**Branch:** `claude/feature/local-support`

---

## Architecture Context

### Project Structure

Frontend lives at `frontend/src/` with this layout:
- `components/` — shared components + feature sub-dirs (e.g., `prayer-wall/`)
- `pages/` — top-level page components
- `hooks/` — custom React hooks (`useAuth.ts`, `useFocusTrap.ts`, etc.)
- `types/` — TypeScript interfaces per feature (`prayer-wall.ts`)
- `mocks/` — mock data modules (`prayer-wall-mock-data.ts`)
- `lib/` — utilities (`utils.ts` has `cn()`, `time.ts` has formatters)
- `components/ui/` — generic UI primitives (`Toast.tsx`, `Button.tsx`, `Card.tsx`)

### Existing Patterns

**Page pattern** (from `PrayerWall.tsx`):
- Inner content function + exported function wrapping with providers
- Skip-to-content link → `<Navbar transparent />` → Hero → `<main id="main-content">`
- Auth check via `useAuth()` hook (currently returns `{ isLoggedIn: false, user: null }`)
- `ToastProvider` wraps pages that need toast notifications
- `AuthModalProvider` wraps pages that need the auth modal

**Hero pattern** (from `PrayerWallHero.tsx`):
- `<section aria-labelledby="...">` with inline `style` for gradient backgrounds
- Gradient: `radial-gradient(ellipse 100% 80% at 50% 0%, #3B0764 0%, transparent 60%)` layered over `linear-gradient(to bottom, #0D0620 → #1E0B3E → #4A1D96 → #F5F5F5)`
- Heading: `font-script text-5xl font-bold text-white sm:text-6xl lg:text-7xl`
- Subtitle: `text-white/85 text-base sm:text-lg lg:text-xl`
- `pt-32 sm:pt-36 lg:pt-40` to clear absolute Navbar

**Card pattern** (from `PrayerCard.tsx`):
- `<article>` with `rounded-xl border border-gray-200 bg-white p-5 transition-shadow sm:p-6 lg:hover:shadow-md`
- Semantic `aria-label` on article

**Share pattern** (from `ShareDropdown.tsx`):
- Absolute-positioned dropdown with `role="menu"`, keyboard nav (ArrowUp/Down/Home/End/Escape)
- Items: Copy Link, Email, SMS (mobile only), Facebook, X
- `navigator.clipboard.writeText()` with "Copied!" feedback

**Test pattern** (from `PrayerWall.test.tsx`):
- `describe` + `it` blocks (vitest)
- `MemoryRouter` with `future` flags wrapping rendered component
- `screen.getByRole()` preferred for queries
- `userEvent.setup()` for interactions
- Render helper function per file

**Navbar** (from `Navbar.tsx`):
- `LOCAL_SUPPORT_LINKS` (line 23): `[{ label: 'Churches', to: '/churches' }, { label: 'Counselors', to: '/counselors' }]`
- Desktop `NavDropdown` at line 284 uses `to="/churches"` as clickable label target
- Mobile drawer iterates `LOCAL_SUPPORT_LINKS` automatically

**Routes** (from `App.tsx`):
- `/churches` and `/counselors` render `<ComingSoon>` stubs (lines 75-76)
- Pattern: `<Route path="/..." element={<Component />} />`

**Mock data** (from `prayer-wall-mock-data.ts`):
- Private `const ARRAY: Type[]` with string IDs (`'user-1'`, etc.)
- Named getter functions exported: `getMockPrayers()`, `getMockUser(id)`, etc.
- ISO 8601 date strings

**Types** (from `prayer-wall.ts`):
- Feature-named file with exported interfaces
- Only one types file exists currently

### Tailwind Custom Values

Defined in `tailwind.config.js`:
- Colors: `primary` (#6D28D9), `primary-lt` (#8B5CF6), `neutral-bg` (#F5F5F5), `text-dark` (#2C3E50), `text-light` (#7F8C8D), `success` (#27AE60), `hero-dark` (#0D0620), `hero-mid` (#1E0B3E)
- Fonts: `font-sans` (Inter), `font-serif` (Lora), `font-script` (Caveat)
- Animations: `animate-dropdown-in`, `animate-slide-from-right`

### Dependencies

No map library exists. Need to add `leaflet` + `react-leaflet` + `@types/leaflet` for Phase 1 (free, no API key). Phase 2 swaps to Google Maps JavaScript API.

### Backend State

Backend is scaffold-only: health endpoint, CORS config. No database, no Flyway, no JPA. All Local Support data is frontend mock data for Phase 1.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] `useAuth()` currently returns `{ isLoggedIn: false, user: null }` for all users — to test the logged-in search UI during development, temporarily change `isLoggedIn` to `true` in `frontend/src/hooks/useAuth.ts`. Revert before committing.
- [ ] The `AuthModalProvider` and `AuthModal` components from `@/components/prayer-wall/` can be imported by Local Support pages (they are not prayer-wall-specific in implementation, just in directory location). No need to move them.
- [ ] Leaflet + react-leaflet will be used for the interactive map in Phase 1 (no Google API key needed). Phase 2 replaces with Google Maps JavaScript API. This is a deviation from the spec's "Google Maps JavaScript API" requirement, accepted because Phase 1 must work without any API key setup.
- [ ] Mock data uses Columbia, TN (lat: 35.6151, lng: -87.0353) as the seed city for all three categories.
- [ ] The existing routes `/churches` and `/counselors` will be replaced with `/local-support/churches` and `/local-support/counselors`. No redirect from old paths (they were just `<ComingSoon>` stubs).
- [ ] No database schema changes needed — bookmarks are stored in React state (mock layer) for Phase 1.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Map library for Phase 1 | Leaflet + react-leaflet (OpenStreetMap tiles) | Free, no API key, fully interactive. Phase 2 swaps to Google Maps. |
| Logged-out UX with `isLoggedIn: false` | Show hero + CTA only; search UI not rendered | Spec requires soft gate. During dev, toggle `useAuth` to test search UI. |
| Geolocation in Phase 1 (mock data) | Accept coordinates but always return mock results near Columbia, TN | Mock service ignores actual coords and returns fixed dataset. UI still exercises the geolocation flow. |
| Geocoding (city/zip → coords) in Phase 1 | Mock geocoder returns Columbia, TN coords for any input | Real geocoding is Phase 2 (Google Geocoding API). |
| Bookmark persistence | React state + localStorage for Phase 1 | Database persistence is Phase 3 (requires backend). |
| Sort by Distance | Calculate distance client-side from user coords to each listing's coords using Haversine formula | No API call needed; works with mock data. |
| Mobile list/map toggle | Two tab-style buttons above results area | Spec says toggle, not stack. Default to list view on mobile. |
| Hero heading font | Use `font-sans font-bold` (Inter Bold) not `font-script` (Caveat) | Spec says "Inter Bold 700 headings" for Local Support heroes. Prayer Wall hero uses Caveat, but that's specific to Prayer Wall's branding. |
| Share URL format | `/local-support/churches?placeId=<id>` | Deep link to specific listing. |
| Counselor disclaimer | Static text below search controls, above results list | Always visible when results are shown (not inside a card). |

---

## Implementation Steps

### Step 1: Types & Service Interface

**Objective:** Define TypeScript interfaces for listings, search params, and the service abstraction layer.

**Files to create:**
- `frontend/src/types/local-support.ts` — all type definitions
- `frontend/src/services/local-support-service.ts` — service interface + factory function

**Details:**

`types/local-support.ts`:
```typescript
export type LocalSupportCategory = 'churches' | 'counselors' | 'celebrate-recovery'

export interface LocalSupportPlace {
  id: string                    // unique ID (maps to Google placeId in Phase 2)
  name: string
  address: string
  phone: string | null
  website: string | null
  lat: number
  lng: number
  rating: number | null         // 1-5 Google star rating
  photoUrl: string | null       // single thumbnail
  description: string | null    // Google Places editorial summary
  hoursOfOperation: string[] | null  // e.g., ["Mon: 9AM-5PM", ...]
  category: LocalSupportCategory
  denomination: string | null   // churches only
  specialties: string[] | null  // counselors only
}

export interface SearchParams {
  lat: number
  lng: number
  radius: number  // miles
  keyword: string
}

export interface SearchResult {
  places: LocalSupportPlace[]
  hasMore: boolean
}

export type SortOption = 'distance' | 'rating' | 'alphabetical'

// Filter options per category
export const DENOMINATION_OPTIONS = [
  'Baptist', 'Methodist', 'Non-denominational', 'Catholic',
  'Presbyterian', 'Lutheran', 'Pentecostal', 'Episcopal',
  'Church of Christ', 'Other',
] as const

export const SPECIALTY_OPTIONS = [
  'Grief', 'Anxiety', 'Depression', 'Addiction',
  'Marriage', 'Trauma', 'Family', 'General',
] as const
```

`services/local-support-service.ts`:
```typescript
export interface LocalSupportService {
  search(params: SearchParams, page: number): Promise<SearchResult>
  geocode(query: string): Promise<{ lat: number; lng: number } | null>
}

// Factory: returns mock service for Phase 1, Google service when API key is available
export function createLocalSupportService(): LocalSupportService {
  // Phase 1: always return mock
  return createMockService()
}
```

**Guardrails (DO NOT):**
- Do NOT add any Google-specific types (like `google.maps.*`) — that's Phase 2
- Do NOT create database entities or backend code — Phase 1 is frontend-only
- Do NOT include user-specific fields (userId, bookmarks) in the place type — bookmarks are managed separately

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| types compile | unit | Verify type file exports all interfaces without errors (implicit via build) |

**Expected state after completion:**
- [ ] `frontend/src/types/local-support.ts` exists with all interfaces
- [ ] `frontend/src/services/local-support-service.ts` exists with interface + factory stub
- [ ] `pnpm build` compiles without errors

---

### Step 2: Mock Data & Mock Service Implementation

**Objective:** Create realistic mock data for all three categories and implement the mock service.

**Files to create:**
- `frontend/src/mocks/local-support-mock-data.ts` — mock listings for churches, counselors, CR groups
- `frontend/src/services/mock-local-support-service.ts` — mock implementation of LocalSupportService

**Details:**

`mocks/local-support-mock-data.ts`:
- 12 mock churches near Columbia, TN (35.6151, -87.0353) — varying denominations, ratings, with/without photos
- 10 mock counselors near Columbia, TN — varying specialties, some with descriptions
- 8 mock Celebrate Recovery groups near Columbia, TN — hosted at various churches
- All coordinates within ~50 miles of Columbia, TN (use real nearby cities: Spring Hill, Franklin, Murfreesboro, Nashville, Lawrenceburg, Pulaski)
- Export getter functions: `getMockChurches()`, `getMockCounselors()`, `getMockCelebrateRecovery()`
- Follow same pattern as `prayer-wall-mock-data.ts`: private `const` arrays, exported getter functions

`services/mock-local-support-service.ts`:
- Implements `LocalSupportService` interface
- `search()`: returns listings from mock data filtered by category keyword, paginated (10 per page), with simulated 300ms delay (`await new Promise(r => setTimeout(r, 300))`)
- `geocode()`: always returns Columbia, TN coords `{ lat: 35.6151, lng: -87.0353 }` regardless of input
- Wire `createMockService()` export for the factory in `local-support-service.ts`

**Guardrails (DO NOT):**
- Do NOT use external image URLs that may break — use `null` for photoUrl (the UI will show a placeholder)
- Do NOT include real phone numbers — use format `(931) 555-XXXX`
- Do NOT persist any data — mock service is stateless (bookmarks handled separately)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `getMockChurches returns array` | unit | Verify getter returns non-empty array of LocalSupportPlace objects |
| `getMockCounselors returns array` | unit | Verify getter returns non-empty array with specialties populated |
| `getMockCelebrateRecovery returns array` | unit | Verify getter returns non-empty array |
| `mock service search returns results` | unit | Verify `search()` returns a `SearchResult` with places array |
| `mock service geocode returns coords` | unit | Verify `geocode()` returns lat/lng object |

**Expected state after completion:**
- [ ] Mock data file has 30+ realistic listings across three categories
- [ ] Mock service implements the interface and returns data
- [ ] `pnpm build` compiles without errors
- [ ] Unit tests pass

---

### Step 3: Install Leaflet & Add Map Dependencies

**Objective:** Add Leaflet and react-leaflet for Phase 1 interactive maps.

**Files to modify:**
- `frontend/package.json` — add dependencies (via `pnpm add`)

**Details:**

Run: `pnpm add leaflet react-leaflet && pnpm add -D @types/leaflet`

Create `frontend/src/styles/leaflet-overrides.css` (if needed for z-index or popup styling):
```css
/* Ensure Leaflet popups appear above other UI */
.leaflet-popup-content-wrapper {
  border-radius: 12px;
  font-family: 'Inter', sans-serif;
}
```

Import Leaflet CSS in `frontend/src/main.tsx`:
```typescript
import 'leaflet/dist/leaflet.css'
```

**Guardrails (DO NOT):**
- Do NOT install `@react-google-maps/api` or any Google Maps library — that's Phase 2
- Do NOT modify any existing component imports

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (none — dependency install) | — | Verified by successful build |

**Expected state after completion:**
- [ ] `leaflet`, `react-leaflet`, and `@types/leaflet` are in `package.json`
- [ ] Leaflet CSS is imported in `main.tsx`
- [ ] `pnpm build` compiles without errors

---

### Step 4: Navigation & Route Updates

**Objective:** Update navbar links, route paths, and add all three Local Support routes.

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — update `LOCAL_SUPPORT_LINKS` + NavDropdown `to` prop
- `frontend/src/App.tsx` — replace `/churches` and `/counselors` routes, add `/local-support/celebrate-recovery`

**Details:**

In `Navbar.tsx`, update `LOCAL_SUPPORT_LINKS` (line 23):
```typescript
const LOCAL_SUPPORT_LINKS = [
  { label: 'Churches', to: '/local-support/churches' },
  { label: 'Counselors', to: '/local-support/counselors' },
  { label: 'Celebrate Recovery', to: '/local-support/celebrate-recovery' },
] as const
```

Update the `NavDropdown` `to` prop (line 286) from `to="/churches"` to `to="/local-support/churches"`.

In `App.tsx`:
- Remove lines 75-76 (old `/churches` and `/counselors` ComingSoon routes)
- Add placeholder imports and routes (will wire to real components in Step 12):
```tsx
<Route path="/local-support/churches" element={<ComingSoon title="Churches" />} />
<Route path="/local-support/counselors" element={<ComingSoon title="Counselors" />} />
<Route path="/local-support/celebrate-recovery" element={<ComingSoon title="Celebrate Recovery" />} />
```

**Guardrails (DO NOT):**
- Do NOT change any other nav links or routes
- Do NOT add redirects from old `/churches` and `/counselors` paths — they were just stubs
- Do NOT modify the mobile drawer code — it iterates `LOCAL_SUPPORT_LINKS` automatically

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `nav dropdown shows Celebrate Recovery` | integration | Render Navbar, verify "Celebrate Recovery" link exists in Local Support dropdown |
| `nav links point to /local-support/*` | integration | Verify all three links have correct `href` attributes |

**Expected state after completion:**
- [ ] Desktop dropdown shows 3 items: Churches, Counselors, Celebrate Recovery
- [ ] Mobile drawer shows 3 items under LOCAL SUPPORT
- [ ] All three `/local-support/*` routes render (ComingSoon placeholders for now)
- [ ] No broken links — existing tests pass
- [ ] `pnpm test` passes

---

### Step 5: LocalSupportHero Component

**Objective:** Create a reusable hero section for all three Local Support pages.

**Files to create:**
- `frontend/src/components/local-support/LocalSupportHero.tsx`

**Details:**

Follow the `PrayerWallHero.tsx` pattern (same gradient, same spacing) but with configurable content:

```typescript
interface LocalSupportHeroProps {
  headingId: string       // for aria-labelledby
  title: string           // e.g., "Find a Church Near You"
  subtitle: string        // warm descriptive text
  extraContent?: ReactNode // CR explainer paragraph (optional)
  action?: ReactNode       // CTA button for logged-out users
}
```

Key differences from PrayerWallHero:
- Heading uses `font-sans font-bold` (Inter Bold 700) instead of `font-script` (Caveat) — spec says Inter for Local Support
- Heading sizes: `text-3xl sm:text-4xl lg:text-5xl` (slightly smaller than Prayer Wall's 5xl/6xl/7xl — these are descriptive titles, not brand names)
- Subtitle: same as PrayerWallHero (`text-white/85`)
- `extraContent` slot for the Celebrate Recovery explainer paragraph (renders below subtitle, above action)
- Same inline `style` gradient as PrayerWallHero

**Guardrails (DO NOT):**
- Do NOT use `font-script` (Caveat) for headings — spec says Inter
- Do NOT hardcode any page-specific text — all content passed via props
- Do NOT use Lucide icons in the hero — just text + optional CTA button

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders heading with provided title` | unit | Pass title="Find a Church Near You", verify h1 text |
| `renders subtitle` | unit | Pass subtitle, verify it renders |
| `renders action when provided` | unit | Pass action={<button>Sign In</button>}, verify button renders |
| `renders extraContent when provided` | unit | Pass extraContent, verify it renders between subtitle and action |
| `does not render action when omitted` | unit | Omit action prop, verify no extra content in hero |

**Expected state after completion:**
- [ ] `LocalSupportHero` renders with gradient background matching Prayer Wall
- [ ] All props work correctly
- [ ] Tests pass

---

### Step 6: Listing Card Component

**Objective:** Create the expandable listing card used in search results and saved tab.

**Files to create:**
- `frontend/src/components/local-support/ListingCard.tsx`

**Details:**

```typescript
interface ListingCardProps {
  place: LocalSupportPlace
  distance: number | null       // miles from user, null if no user location
  isBookmarked: boolean
  isHighlighted: boolean        // true when corresponding map pin is selected
  onToggleBookmark: (placeId: string) => void
  onShare: (placeId: string) => void
  onExpand: (placeId: string) => void
  isExpanded: boolean
}
```

Structure:
- `<article>` with `rounded-xl border border-gray-200 bg-white p-5 transition-shadow sm:p-6 lg:hover:shadow-md` (same as PrayerCard)
- When `isHighlighted`: add `ring-2 ring-primary` outline
- **Collapsed view:** Name (bold `text-lg font-semibold text-text-dark`), distance badge, address, phone (`<a href="tel:...">` clickable), rating (gold stars), photo thumbnail (if available, 80x80 rounded), bookmark icon, share icon, expand chevron
- **Expanded view:** Smooth `max-height` transition. Shows website link (`target="_blank" rel="noopener noreferrer"`), hours, denomination/specialties (if present), description, "Get Directions" link to Google Maps (`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
- Bookmark icon: `Bookmark` from lucide-react, filled/colored (`text-success fill-success`) when bookmarked, outline when not
- Share icon: `Share2` from lucide-react
- Expand chevron: `ChevronDown` rotates 180deg when expanded
- Star rating: render filled/empty stars using a simple loop (1-5), gold color `text-amber-400`
- Photo placeholder: gray rounded div with `ImageOff` icon when no photo

Accessibility:
- `aria-label` on article: `${place.name} — ${place.address}`
- Bookmark button: `aria-pressed={isBookmarked}`, `aria-label="Bookmark ${place.name}"`
- Expand button: `aria-expanded={isExpanded}`, `aria-controls="${place.id}-details"`
- Expanded section: `id="${place.id}-details"`

**Guardrails (DO NOT):**
- Do NOT navigate to a detail page on card click — expand inline only
- Do NOT render denomination for counselors or specialties for churches — check `place.category`
- Do NOT use `dangerouslySetInnerHTML` for any place data

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders place name and address` | unit | Verify name and address text appear |
| `renders clickable phone link` | unit | Verify `<a href="tel:...">` when phone is present |
| `expands to show details on chevron click` | unit | Click expand, verify website/hours section appears |
| `bookmark toggle calls handler` | unit | Click bookmark, verify `onToggleBookmark` called with placeId |
| `highlighted card has ring` | unit | Pass `isHighlighted=true`, verify `ring-2` class |
| `no phone link when phone is null` | unit | Pass place with `phone: null`, verify no `tel:` link |
| `star rating renders correctly` | unit | Pass `rating: 4.5`, verify 4-5 star elements |

**Expected state after completion:**
- [ ] Card renders with all fields, expands/collapses smoothly
- [ ] Bookmark and share callbacks work
- [ ] Highlight ring appears when `isHighlighted` is true
- [ ] Tests pass

---

### Step 7: Share Dropdown for Listings

**Objective:** Create a share dropdown adapted from the Prayer Wall's ShareDropdown for Local Support listings.

**Files to create:**
- `frontend/src/components/local-support/ListingShareDropdown.tsx`

**Details:**

Follow the exact pattern from `prayer-wall/ShareDropdown.tsx` (same keyboard navigation, same dropdown styling, same social links) but adapted for listing data:

```typescript
interface ListingShareDropdownProps {
  placeId: string
  placeName: string
  category: LocalSupportCategory
  isOpen: boolean
  onClose: () => void
}
```

- Share URL: `${window.location.origin}/local-support/${category}?placeId=${placeId}`
- Share text: `"Check out ${placeName} on Worship Room — ${shareUrl}"`
- Same menu items: Copy Link, Email, SMS (mobile only), Facebook, X
- Same keyboard navigation (ArrowUp/Down/Home/End/Escape)
- Same styling: `absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg`
- Web Share API: On mobile, try `navigator.share()` first. If supported, use it instead of showing the dropdown. If not supported, show the dropdown fallback.

**Guardrails (DO NOT):**
- Do NOT modify the prayer-wall ShareDropdown — create a new one
- Do NOT share user data or location in the share URL — only placeId and category

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders all share options` | unit | Open dropdown, verify Copy Link, Email, Facebook, X visible |
| `copy link writes to clipboard` | unit | Click Copy Link, verify `navigator.clipboard.writeText` called |
| `escape closes dropdown` | unit | Press Escape, verify `onClose` called |

**Expected state after completion:**
- [ ] Share dropdown renders with correct share URL format
- [ ] Keyboard navigation works
- [ ] Tests pass

---

### Step 8: Search Controls Component

**Objective:** Create the location search bar with geolocation, city/zip input, and radius slider.

**Files to create:**
- `frontend/src/components/local-support/SearchControls.tsx`

**Details:**

```typescript
interface SearchControlsProps {
  onSearch: (lat: number, lng: number, radius: number) => void
  initialLat?: number
  initialLng?: number
  initialRadius?: number
  isLoading: boolean
}
```

Layout:
- Row 1: "Use My Location" button (`MapPin` icon) | city/zip text input (`<input type="text" placeholder="City or zip code">`) | Search button (`Search` icon)
- Row 2: Radius slider (`<input type="range" min={1} max={100} step={1}>`) with current value display ("25 miles")
- Mile marker labels along slider track: 1, 25, 50, 75, 100

Geolocation flow:
1. Click "Use My Location" → call `navigator.geolocation.getCurrentPosition()`
2. Success: populate hidden lat/lng state, auto-trigger `onSearch(lat, lng, radius)`
3. Error/denied: show inline message "Location access denied — enter your city or zip code instead." using `text-sm text-text-light` below the input row
4. Timeout: same fallback message

City/zip flow:
1. User types city or zip, clicks Search (or presses Enter)
2. Call `service.geocode(query)` (mock returns Columbia, TN in Phase 1)
3. On result: trigger `onSearch(lat, lng, radius)`
4. On failure: show "We couldn't find that location. Please try a different city name or zip code."

Radius slider:
- `accent-primary` for slider color
- Label shows `{radius} mile{radius !== 1 ? 's' : ''}`
- `onChange`: if location already set, debounce 500ms then re-trigger `onSearch`

Styling:
- Button: `bg-primary text-white rounded-lg px-4 py-2.5 font-medium hover:bg-primary-lt`
- Input: `rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20`
- Slider: full width with custom accent color

Accessibility:
- `<label>` for city/zip input: "City or zip code"
- Slider: `<label>` "Search radius" + `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- "Use My Location" button: `aria-label="Use my current location"`

**Guardrails (DO NOT):**
- Do NOT call Google Geocoding API — use the service abstraction's `geocode()` method
- Do NOT store location in localStorage — it's session-only
- Do NOT auto-geolocate on page load — only on button click

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders location input and search button` | unit | Verify input, Use My Location button, Search button render |
| `renders radius slider with default value 25` | unit | Verify slider renders with value 25 |
| `search button calls onSearch` | unit | Enter text, click Search, verify `onSearch` called |
| `radius slider updates displayed value` | unit | Change slider, verify label updates |

**Expected state after completion:**
- [ ] Search controls render with all elements
- [ ] Geolocation flow works (request permission, handle deny)
- [ ] City/zip input triggers search via service
- [ ] Radius slider re-triggers search with debounce
- [ ] Tests pass

---

### Step 9: Results Map Component (Leaflet)

**Objective:** Create an interactive map component using Leaflet/react-leaflet with pins for listings.

**Files to create:**
- `frontend/src/components/local-support/ResultsMap.tsx`

**Details:**

```typescript
interface ResultsMapProps {
  places: LocalSupportPlace[]
  center: { lat: number; lng: number }
  selectedPlaceId: string | null
  onSelectPlace: (placeId: string) => void
}
```

Implementation:
- Use `MapContainer`, `TileLayer`, `Marker`, `Popup` from `react-leaflet`
- OpenStreetMap tile layer: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` with attribution
- Default zoom: 10 (shows ~25 mile radius)
- Markers for each place using default Leaflet marker icon
- Fix Leaflet default marker icon issue (broken image in Vite): import and configure `L.Icon.Default` with the marker images from leaflet's dist
- Clicking a marker: call `onSelectPlace(place.id)` and show popup with name, address, distance
- Popup content: Name (bold), address, "View Details" button that triggers `onSelectPlace`
- Selected marker: use a different color or z-index bump (simplest: just open the popup for the selected marker)
- Map re-centers when `center` prop changes (use `useMap()` hook inside a child component)
- Responsive: `w-full h-[400px] lg:h-full` (fixed height on mobile, stretch on desktop)

Leaflet icon fix (Vite bundling issue):
```typescript
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})
```

**Guardrails (DO NOT):**
- Do NOT import or reference Google Maps — Leaflet only for Phase 1
- Do NOT make the map take full viewport height — it shares space with the list
- Do NOT lazy-load the map (it's a core UI element, not a performance concern)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders map container` | unit | Verify a `.leaflet-container` element is rendered |
| `renders markers for places` | unit | Pass 3 places, verify 3 marker elements exist |

Note: Leaflet map tests require mocking `ResizeObserver` and may need shallow assertions. Full map interaction tests are better done via Playwright.

**Expected state after completion:**
- [ ] Map renders with OpenStreetMap tiles centered on provided coords
- [ ] Pins appear for each place
- [ ] Clicking a pin shows popup and calls `onSelectPlace`
- [ ] Tests pass (or are appropriately skipped for DOM-heavy Leaflet rendering)

---

### Step 10: Results List Component

**Objective:** Create the results list with sort dropdown, listing cards, and Load More pagination.

**Files to create:**
- `frontend/src/components/local-support/ResultsList.tsx`

**Details:**

```typescript
interface ResultsListProps {
  places: LocalSupportPlace[]
  userCoords: { lat: number; lng: number } | null
  sortOption: SortOption
  onSortChange: (sort: SortOption) => void
  selectedPlaceId: string | null
  onSelectPlace: (placeId: string) => void
  bookmarkedIds: Set<string>
  onToggleBookmark: (placeId: string) => void
  onShare: (placeId: string) => void
  hasMore: boolean
  onLoadMore: () => void
  isLoadingMore: boolean
  category: LocalSupportCategory
  filterValue: string | null       // current denomination or specialty filter
  onFilterChange: (value: string | null) => void
  filterOptions: readonly string[] | null  // null = no filter for this category
  filterLabel: string | null       // "Denomination" or "Specialty"
}
```

Layout (top to bottom):
1. **Controls row:** Sort dropdown (left) + Filter dropdown (right, if applicable)
2. **Scrollable card list:** Each card wrapped with `ListingCard` component
3. **Load More button:** `"Load More" bg-white border border-gray-200 rounded-lg px-6 py-3 text-sm font-medium text-text-dark hover:bg-gray-50`

Sort dropdown:
- `<select>` styled with `rounded-lg border border-gray-300 px-3 py-2 text-sm`
- Options: Distance, Rating, A-Z
- Sort is client-side: reorder `places` array based on selection

Filter dropdown (churches: denomination, counselors: specialty):
- Same `<select>` styling
- Options from `DENOMINATION_OPTIONS` or `SPECIALTY_OPTIONS` + "All" default
- Filtering is client-side keyword matching on `place.denomination` or `place.specialties`

Distance calculation:
- Haversine formula utility function `calculateDistance(lat1, lng1, lat2, lng2): number` (returns miles)
- Add to `frontend/src/lib/geo.ts`

Card list:
- `<div className="space-y-4">` containing `ListingCard` components
- Track expanded card via local state `expandedPlaceId: string | null`
- When a card is clicked in list: call `onSelectPlace(placeId)` to sync with map

**Guardrails (DO NOT):**
- Do NOT fetch new data on sort change — sort is client-side
- Do NOT filter on the server — filter is client-side keyword matching
- Do NOT show distance if `userCoords` is null

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders listing cards` | unit | Pass 3 places, verify 3 articles rendered |
| `sort dropdown changes order` | unit | Select "A-Z", verify first card name is alphabetically first |
| `Load More button calls handler` | unit | Click Load More, verify `onLoadMore` called |
| `filter dropdown filters results` | unit | Select "Baptist", verify only Baptist churches shown |

**Expected state after completion:**
- [ ] Results list renders cards with sort + filter controls
- [ ] Sort reorders cards client-side
- [ ] Filter narrows results client-side
- [ ] Load More triggers pagination
- [ ] Tests pass

---

### Step 11: Empty, Error & Loading State Components

**Objective:** Create reusable state components for search-not-started, no-results, error, and loading skeleton.

**Files to create:**
- `frontend/src/components/local-support/SearchStates.tsx` — all state variants in one file

**Details:**

Four exported components:

**`SearchPrompt`** (no search yet):
```typescript
interface SearchPromptProps { category: LocalSupportCategory }
```
- `MapPin` icon (Lucide), `text-text-light` color, large centered
- Text: "Enter your location to find [churches/counselors/Celebrate Recovery groups] near you"
- Category-specific noun auto-selected

**`NoResults`**:
```typescript
interface NoResultsProps { radius: number; category: LocalSupportCategory }
```
- `SearchX` icon, `text-text-light`
- Text: "We couldn't find any [noun] within [radius] miles. Try expanding your search radius or searching a different area."

**`SearchError`**:
```typescript
interface SearchErrorProps { message: string; onRetry: () => void }
```
- `AlertCircle` icon, `text-danger`
- Message text + "Try Again" button

**`ListingSkeleton`** (loading cards):
- 3 skeleton cards matching `ListingCard` dimensions
- Animated pulse: `animate-pulse bg-gray-200 rounded`
- Same card structure: name bar, address bar, phone bar, action icons

All components:
- Centered in container, `py-12` vertical padding
- Warm, compassionate copy matching the app's tone

**Guardrails (DO NOT):**
- Do NOT show crisis resources on these pages (spec decision)
- Do NOT use harsh error language — keep it gentle

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `SearchPrompt renders for churches` | unit | Pass 'churches', verify "churches" in text |
| `NoResults shows radius` | unit | Pass radius=50, verify "50 miles" in text |
| `SearchError renders retry button` | unit | Verify "Try Again" button calls onRetry |
| `ListingSkeleton renders 3 skeleton cards` | unit | Verify 3 pulse-animated elements |

**Expected state after completion:**
- [ ] All four state components render with correct content
- [ ] Tests pass

---

### Step 12: Shared LocalSupportPage Template

**Objective:** Create the main reusable page component that wires hero, search, map, list, saved tab, and states together.

**Files to create:**
- `frontend/src/components/local-support/LocalSupportPage.tsx`

**Details:**

```typescript
interface LocalSupportPageConfig {
  category: LocalSupportCategory
  headingId: string
  title: string
  subtitle: string
  extraHeroContent?: ReactNode   // CR explainer
  searchKeyword: string
  filterOptions: readonly string[] | null
  filterLabel: string | null
  disclaimer?: string            // counselor disclaimer
}

interface LocalSupportPageProps {
  config: LocalSupportPageConfig
}
```

Full page structure:
```
<ToastProvider>
  <AuthModalProvider>
    <div className="min-h-screen bg-neutral-bg font-sans">
      <a href="#main-content" ...>Skip to content</a>
      <Navbar transparent />
      <LocalSupportHero ... />

      {isLoggedIn ? (
        <main id="main-content">
          {disclaimer && <DisclaimerBanner />}
          <SearchControls ... />

          {/* Tabs: Search Results | Saved */}
          <TabBar activeTab={...} onTabChange={...} savedCount={...} />

          {activeTab === 'search' ? (
            <SearchResultsView>
              {/* States: prompt / loading / error / no-results / results */}

              {/* Desktop: side-by-side */}
              <div className="hidden lg:grid lg:grid-cols-[1fr_1fr] lg:gap-6">
                <ResultsList ... />
                <div className="sticky top-24 h-[calc(100vh-8rem)]">
                  <ResultsMap ... />
                </div>
              </div>

              {/* Mobile: toggle */}
              <div className="lg:hidden">
                <ViewToggle view={mobileView} onToggle={...} />
                {mobileView === 'list' ? <ResultsList ... /> : <ResultsMap ... />}
              </div>
            </SearchResultsView>
          ) : (
            <SavedView>
              {/* Same layout but with bookmarked items */}
            </SavedView>
          )}
        </main>
      ) : (
        <main id="main-content" className="mx-auto max-w-2xl px-4 py-12 text-center">
          <button onClick={openAuthModal} className="...">
            Sign In to Search
          </button>
        </main>
      )}
    </div>
  </AuthModalProvider>
</ToastProvider>
```

State management (all local `useState`):
- `searchResults: LocalSupportPlace[]`
- `userCoords: { lat: number; lng: number } | null`
- `radius: number` (default 25)
- `sortOption: SortOption` (default 'distance')
- `filterValue: string | null`
- `bookmarkedIds: Set<string>` (persisted to localStorage via `useEffect`)
- `selectedPlaceId: string | null` (syncs between map and list)
- `expandedPlaceId: string | null`
- `activeTab: 'search' | 'saved'`
- `mobileView: 'list' | 'map'` (default 'list')
- `searchState: 'idle' | 'loading' | 'error' | 'success'`
- `page: number` (for Load More pagination)
- `hasMore: boolean`

URL state (via `useSearchParams`):
- Read `lat`, `lng`, `radius` from URL params on mount → auto-execute search
- Read `placeId` from URL params → auto-expand that listing
- Update URL params after each search

localStorage bookmarks:
- Key: `worship-room-bookmarks-${category}`
- Value: JSON array of place IDs
- Load on mount, save on change

Main content area: `mx-auto max-w-6xl px-4 py-6 sm:py-8` (wider than Prayer Wall's 720px to accommodate map)

Tab bar: Two tab buttons — "Search Results" and "Saved (N)" — styled like pill toggles

**Guardrails (DO NOT):**
- Do NOT render search UI for logged-out users — only hero + CTA
- Do NOT persist search results — only bookmarks persist
- Do NOT share state between categories — each page instance is independent
- Do NOT use `dangerouslySetInnerHTML` for any API data
- Do NOT make real API calls — use the service abstraction

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `renders hero with provided title` | integration | Verify hero heading matches config title |
| `logged-out shows CTA button` | integration | With default useAuth (logged out), verify "Sign In to Search" visible and search UI hidden |
| `disclaimer renders for counselors` | integration | Pass disclaimer config, verify text appears |

**Expected state after completion:**
- [ ] Page template renders hero, handles auth gating
- [ ] Search → results → map/list flow works end-to-end with mock data
- [ ] URL params sync with search state
- [ ] Bookmarks persist via localStorage
- [ ] Mobile list/map toggle works
- [ ] Saved tab shows bookmarked items
- [ ] Tests pass

---

### Step 13: Three Page Wrappers

**Objective:** Create the three page components (Churches, Counselors, CR) as thin wrappers around LocalSupportPage, and wire them into App.tsx routes.

**Files to create:**
- `frontend/src/pages/Churches.tsx`
- `frontend/src/pages/Counselors.tsx`
- `frontend/src/pages/CelebrateRecovery.tsx`

**Files to modify:**
- `frontend/src/App.tsx` — replace ComingSoon with real page imports

**Details:**

Each page is a thin config wrapper:

`Churches.tsx`:
```tsx
import { LocalSupportPage } from '@/components/local-support/LocalSupportPage'
import { DENOMINATION_OPTIONS } from '@/types/local-support'

export function Churches() {
  return (
    <LocalSupportPage
      config={{
        category: 'churches',
        headingId: 'churches-heading',
        title: 'Find a Church Near You',
        subtitle: 'Your healing journey was never meant to be walked alone. A local church can be a place of belonging, encouragement, and spiritual growth — a community that walks with you through every season.',
        searchKeyword: 'church',
        filterOptions: DENOMINATION_OPTIONS,
        filterLabel: 'Denomination',
      }}
    />
  )
}
```

`Counselors.tsx`:
```tsx
import { LocalSupportPage } from '@/components/local-support/LocalSupportPage'
import { SPECIALTY_OPTIONS } from '@/types/local-support'

export function Counselors() {
  return (
    <LocalSupportPage
      config={{
        category: 'counselors',
        headingId: 'counselors-heading',
        title: 'Find a Christian Counselor',
        subtitle: 'Sometimes the bravest step in healing is asking for help. A faith-based counselor can offer professional guidance rooted in compassion, understanding, and Biblical truth.',
        searchKeyword: 'Christian counselor',
        filterOptions: SPECIALTY_OPTIONS,
        filterLabel: 'Specialty',
        disclaimer: 'Worship Room does not endorse or verify any counselor listed here. Please research any counselor before scheduling an appointment. If you are in crisis, call 988 (Suicide & Crisis Lifeline).',
      }}
    />
  )
}
```

`CelebrateRecovery.tsx`:
```tsx
import { LocalSupportPage } from '@/components/local-support/LocalSupportPage'

export function CelebrateRecovery() {
  return (
    <LocalSupportPage
      config={{
        category: 'celebrate-recovery',
        headingId: 'celebrate-recovery-heading',
        title: 'Find Celebrate Recovery',
        subtitle: "Freedom from hurts, habits, and hang-ups starts with showing up. Celebrate Recovery is a Christ-centered 12-step recovery program where you'll find people who understand — because they've been there too.",
        extraHeroContent: (
          <div className="mx-auto mt-4 max-w-2xl rounded-xl bg-white/10 px-6 py-4 text-left text-sm text-white/80 backdrop-blur-sm">
            <p className="font-semibold text-white">What is Celebrate Recovery?</p>
            <p className="mt-1">
              Celebrate Recovery is a Christ-centered, 12-step recovery program for anyone struggling with hurts, habits, and hang-ups. Based on the Beatitudes, it meets weekly at local churches across the country and offers a safe space for healing through small groups, worship, and community support.
            </p>
          </div>
        ),
        searchKeyword: 'Celebrate Recovery',
        filterOptions: null,
        filterLabel: null,
      }}
    />
  )
}
```

Update `App.tsx`:
- Add imports for `Churches`, `Counselors`, `CelebrateRecovery`
- Replace ComingSoon routes:
```tsx
<Route path="/local-support/churches" element={<Churches />} />
<Route path="/local-support/counselors" element={<Counselors />} />
<Route path="/local-support/celebrate-recovery" element={<CelebrateRecovery />} />
```

**Guardrails (DO NOT):**
- Do NOT add business logic in page wrappers — they are config-only
- Do NOT use official Celebrate Recovery branding, logos, or trademarked imagery
- Do NOT hardcode the counselor disclaimer text outside the Counselors page config

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Churches page renders hero` | integration | Render Churches, verify "Find a Church Near You" heading |
| `Counselors page renders disclaimer` | integration | Render Counselors, verify disclaimer text appears |
| `CelebrateRecovery page renders explainer` | integration | Render CR page, verify "What is Celebrate Recovery?" text |
| `all routes render without errors` | integration | Navigate to each route, verify no crash |

**Expected state after completion:**
- [ ] All three routes render their respective pages
- [ ] Churches shows denomination filter
- [ ] Counselors shows specialty filter + disclaimer
- [ ] CR shows explainer in hero, no filter
- [ ] Navigation from navbar to pages works
- [ ] Tests pass

---

### Step 14: Geo Utility

**Objective:** Create a Haversine distance calculation utility for sorting results by distance.

**Files to create:**
- `frontend/src/lib/geo.ts`

**Details:**

```typescript
/**
 * Calculate distance between two coordinates using the Haversine formula.
 * @returns Distance in miles
 */
export function calculateDistanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
```

**Guardrails (DO NOT):**
- Do NOT use an external library for this — it's a single function
- Do NOT return kilometers — the app uses miles

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `returns 0 for same coordinates` | unit | `calculateDistanceMiles(35.6, -87.0, 35.6, -87.0)` === 0 |
| `returns ~30 miles for Columbia to Nashville` | unit | Verify ~40-50 mile result for known coords |
| `handles negative coordinates` | unit | Verify no NaN or negative result |

**Expected state after completion:**
- [ ] `geo.ts` exports `calculateDistanceMiles()`
- [ ] Tests pass with reasonable accuracy (within 1 mile of expected for known distances)

---

### Step 15: Page Tests

**Objective:** Add comprehensive tests for all three pages and key components.

**Files to create:**
- `frontend/src/pages/__tests__/Churches.test.tsx`
- `frontend/src/pages/__tests__/Counselors.test.tsx`
- `frontend/src/pages/__tests__/CelebrateRecovery.test.tsx`
- `frontend/src/components/local-support/__tests__/ListingCard.test.tsx`
- `frontend/src/components/local-support/__tests__/SearchControls.test.tsx`
- `frontend/src/components/local-support/__tests__/SearchStates.test.tsx`
- `frontend/src/lib/__tests__/geo.test.ts`

**Details:**

Follow the test patterns from `PrayerWall.test.tsx`:
- `MemoryRouter` wrapper with `future` flags
- `renderPage()` helper function
- `screen.getByRole()` for queries
- `userEvent.setup()` for interactions

Page tests (per page):
- Renders hero with correct heading text
- Shows subtitle text
- CTA button renders (for logged-out state, which is default)
- Page-specific: Churches has "Denomination" label, Counselors has disclaimer, CR has explainer

Component tests:
- `ListingCard.test.tsx`: render, expand, bookmark toggle, highlight, phone link
- `SearchControls.test.tsx`: render inputs, search button callback, radius slider
- `SearchStates.test.tsx`: each state variant renders correct icon + message
- `geo.test.ts`: distance calculations

**Guardrails (DO NOT):**
- Do NOT test Leaflet map rendering in unit tests (it requires full DOM) — verify via Playwright instead
- Do NOT mock `useAuth` to return `true` in page tests — test the default logged-out behavior

**Test specifications:**
(See individual tests listed above — approximately 25-30 test cases across all files)

**Expected state after completion:**
- [ ] All test files created and passing
- [ ] `pnpm test` passes with 0 failures
- [ ] Coverage includes hero rendering, auth gating, card interactions, search controls, state variants

---

### Step 16: CLAUDE.md & Route Updates

**Objective:** Update project documentation to reflect new routes and feature.

**Files to modify:**
- `frontend/src/App.tsx` — ensure no stale ComingSoon references remain for churches/counselors
- Verify `CLAUDE.md` Routes section references are correct (routes already listed as `/churches` and `/counselors` — update if present)

**Details:**

Check `CLAUDE.md` for any references to `/churches` or `/counselors` routes. If found, update to `/local-support/churches` and `/local-support/counselors`. Add `/local-support/celebrate-recovery` if a routes list exists.

Also verify the Navigation Structure section in `CLAUDE.md` matches the new 3-item Local Support dropdown.

**Guardrails (DO NOT):**
- Do NOT rewrite CLAUDE.md — only update the specific route/nav references
- Do NOT add implementation details to CLAUDE.md — it's a project guide, not a technical spec

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| (none — documentation update) | — | Manual verification |

**Expected state after completion:**
- [ ] CLAUDE.md route references updated
- [ ] No stale `/churches` or `/counselors` references in codebase
- [ ] `pnpm test` still passes
- [ ] `pnpm build` succeeds

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Types & Service Interface |
| 2 | 1 | Mock Data & Mock Service Implementation |
| 3 | — | Install Leaflet & Add Map Dependencies |
| 4 | — | Navigation & Route Updates |
| 5 | — | LocalSupportHero Component |
| 6 | 1 | Listing Card Component |
| 7 | 1 | Share Dropdown for Listings |
| 8 | 1, 2 | Search Controls Component |
| 9 | 1, 3 | Results Map Component (Leaflet) |
| 10 | 1, 6, 7, 14 | Results List Component |
| 11 | 1 | Empty, Error & Loading State Components |
| 12 | 2, 4, 5, 8, 9, 10, 11 | Shared LocalSupportPage Template |
| 13 | 12 | Three Page Wrappers |
| 14 | — | Geo Utility |
| 15 | 13 | Page Tests |
| 16 | 13 | CLAUDE.md & Route Updates |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Types & Service Interface | [COMPLETE] | 2026-03-02 | Created `types/local-support.ts` + `services/local-support-service.ts`. Fixed pre-existing type errors in PrayerWall.tsx (useAuthModal optional) and PrayerWallDashboard.tsx (unused user var, bio type). |
| 2 | Mock Data & Mock Service Implementation | [COMPLETE] | 2026-03-02 | Created `mocks/local-support-mock-data.ts` (12 churches, 10 counselors, 8 CR groups), `services/mock-local-support-service.ts`, updated `services/local-support-service.ts` with factory. 9 tests pass. |
| 3 | Install Leaflet & Add Map Dependencies | [COMPLETE] | 2026-03-02 | Installed leaflet@1.9.4, react-leaflet@4.2.1, @types/leaflet@1.9.21. Used v4 (not v5) for React 18 compat. Imported leaflet CSS in main.tsx. |
| 4 | Navigation & Route Updates | [COMPLETE] | 2026-03-02 | Updated LOCAL_SUPPORT_LINKS (3 items), NavDropdown to prop, App.tsx routes. Updated Navbar.test.tsx assertions. All tests pass. |
| 5 | LocalSupportHero Component | [COMPLETE] | 2026-03-02 | Created `components/local-support/LocalSupportHero.tsx` with headingId, title, subtitle, extraContent, action props. 6 tests pass. |
| 6 | Listing Card Component | [COMPLETE] | 2026-03-02 | Created `components/local-support/ListingCard.tsx` with expand/collapse, bookmark, share, star rating, highlight ring. 13 tests pass. |
| 7 | Share Dropdown for Listings | [COMPLETE] | 2026-03-02 | Created `components/local-support/ListingShareDropdown.tsx` with keyboard nav, copy link, email, SMS, Facebook, X. Added `tryWebShare` utility. 4 tests pass. |
| 8 | Search Controls Component | [COMPLETE] | 2026-03-02 | Created `components/local-support/SearchControls.tsx` with geolocation, city/zip input, radius slider (1-100, default 25), debounced re-search. 5 tests pass. |
| 9 | Results Map Component (Leaflet) | [COMPLETE] | 2026-03-02 | Created `components/local-support/ResultsMap.tsx` with react-leaflet MapContainer, OpenStreetMap tiles, Marker+Popup, MapUpdater, SelectedMarkerOpener. Build passes. Unit tests skipped per plan (Leaflet requires full DOM). |
| 10 | Results List Component | [COMPLETE] | 2026-03-02 | Created `components/local-support/ResultsList.tsx` with sort (distance/rating/A-Z), filter, Load More, card expansion, share integration, distance calculation. Build passes. |
| 11 | Empty, Error & Loading State Components | [COMPLETE] | 2026-03-02 | Created `components/local-support/SearchStates.tsx` with SearchPrompt, NoResults, SearchError, ListingSkeleton. 6 tests pass. |
| 12 | Shared LocalSupportPage Template | [COMPLETE] | 2026-03-02 | Created `components/local-support/LocalSupportPage.tsx` — full page template with hero, auth gate, search controls, results list+map (desktop side-by-side, mobile toggle), saved tab, URL params sync, localStorage bookmarks. Build + all tests pass. |
| 13 | Three Page Wrappers | [COMPLETE] | 2026-03-02 | Created `pages/Churches.tsx`, `pages/Counselors.tsx`, `pages/CelebrateRecovery.tsx` as thin config wrappers. Updated `App.tsx` routes to import and use real components. Build + all 321 tests pass. |
| 14 | Geo Utility | [COMPLETE] | 2026-03-02 | Created `lib/geo.ts` with Haversine `calculateDistanceMiles()`. 4 tests pass. |
| 15 | Page Tests | [COMPLETE] | 2026-03-02 | Created `pages/__tests__/Churches.test.tsx` (5 tests), `Counselors.test.tsx` (5 tests), `CelebrateRecovery.test.tsx` (6 tests). All 337 tests pass. Component tests for ListingCard, SearchControls, SearchStates, geo already created in earlier steps. |
| 16 | CLAUDE.md & Route Updates | [COMPLETE] | 2026-03-02 | Updated CLAUDE.md: routes `/churches`→`/local-support/churches`, `/counselors`→`/local-support/counselors`, added `/local-support/celebrate-recovery`. Added Celebrate Recovery to nav dropdown, mobile drawer, feature list (#35). Renumbered items 36-68. No stale route refs in source. Build + all 337 tests pass. |
