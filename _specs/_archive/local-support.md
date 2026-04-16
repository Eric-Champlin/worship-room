# Feature: Local Support — Churches, Counselors & Celebrate Recovery

## Overview

The Local Support feature connects users with real-world spiritual and emotional support in their area — local churches, Christian counselors, and Celebrate Recovery groups. It extends Worship Room's mission beyond digital tools by helping users find physical communities, professional help, and recovery programs nearby. Healing doesn't happen in isolation; sometimes the next step is walking through the doors of a church, sitting across from a counselor, or joining a room full of people who understand your struggle. This feature bridges the digital experience with the real world.

Each category lives on its own page with a shared layout: an inspirational hero section, location-based search with a radius slider, and an interactive map + list view showing results from the Google Places API (New). The feature is soft-gated behind authentication — logged-out visitors see the hero and a sign-in CTA, while logged-in users get the full search experience. This gate exists because Google API calls incur per-request costs.

## User Stories

- As a **logged-in user**, I want to search for churches near my location so I can find a faith community to attend.
- As a **logged-in user**, I want to search for Christian counselors near me so I can find professional, faith-based mental health support.
- As a **logged-in user**, I want to find Celebrate Recovery groups near me so I can attend a Christ-centered recovery program.
- As a **logged-in user**, I want to bookmark churches, counselors, and CR groups so I can revisit them later.
- As a **logged-in user**, I want to share a listing with someone via link, email, SMS, or social media.
- As a **logged-out visitor**, I want to see what the Local Support feature offers (hero section, description) so I understand its value before signing up.

## Requirements

### Routes

| Route | Page | Auth Required to Search |
|-------|------|------------------------|
| `/local-support/churches` | Church Finder | Yes (soft gate) |
| `/local-support/counselors` | Counselor Finder | Yes (soft gate) |
| `/local-support/celebrate-recovery` | Celebrate Recovery Finder | Yes (soft gate) |

- No parent `/local-support` landing page. The nav dropdown is the only entry point.
- Search parameters reflected in URL for sharing/bookmarking (e.g., `?lat=35.6151&lng=-87.0353&radius=25`)
- Navigating to a URL with search params auto-executes the search
- Deep link support for individual listings via `?placeId=...`

### Navigation Update

The "Local Support" dropdown in the navbar must be updated from two items to three:

| Current | New |
|---------|-----|
| Churches | Churches |
| Counselors | Counselors |
| *(none)* | Celebrate Recovery |

Both desktop dropdown and mobile drawer must reflect this update. Route paths change from `/churches` and `/counselors` to `/local-support/churches` and `/local-support/counselors`.

### Authentication & Access (Soft Gate Pattern)

**Logged-out visitors** can visit all three pages and see:
1. The hero/intro section (headline, subtext, icon — matching the purple gradient hero style)
2. A "Sign In to Search" CTA button below the hero (opens the auth modal, same pattern as Prayer Wall interaction gates)

They cannot access the search bar, radius slider, map, results, or saved tab. The search UI is not rendered for logged-out users.

**Logged-in users** see the full page: hero section + search controls + results area (map + list) + Saved tab.

### Shared Page Layout (All Three Pages)

All three pages share the same structural template, differing only in content, copy, search keywords, and available filters.

#### Hero / Intro Section
- Purple gradient background matching Home and Prayer Wall heroes (`#0D0620` dark purple to `#6D28D9` primary violet), white text, Inter font
- Each page has a unique title and warm, compassionate subtext
- Logged-out CTA: "Sign In to Search" button (opens auth modal)
- Lucide React icons (no custom illustrations)

#### Search Controls (Logged-In Only)
- "Use My Location" button (triggers browser geolocation) OR text input for city/zip code, plus a Search button
- Geolocation: if granted, coordinates populate and search triggers automatically; if denied, graceful fallback to manual input with message
- City/zip input uses Geocoding API to convert to lat/lng
- Radius slider: 1-100 miles, default 25, with mile marker labels; changing radius re-triggers search

#### Results Area (Logged-In Only)
- **Desktop:** Scrollable list on the left, interactive Google Map on the right (side-by-side)
- **Mobile:** Toggle between "List View" and "Map View" (not stacked vertically)
- Map uses Google Maps JavaScript API with standard pins; clicking a pin shows info popup and highlights the corresponding list card
- Clicking a list card highlights/bounces the corresponding map pin
- Pagination: "Load More" button (not infinite scroll)
- Sort dropdown: Distance (default), Rating, Alphabetical

#### Saved Tab (Logged-In Only)
- Tabs: "Search Results" | "Saved"
- Shows bookmarked listings scoped to current category
- Same card layout as search results, with a map showing saved item pins
- Saved items persist across sessions (database-backed)

### Listing Card Design

Each listing card shows:
- Name (bold), distance, full address, clickable phone (`tel:` link), Google star rating, single thumbnail photo (if available)
- Action icons: Bookmark (toggle), Share
- Expand arrow/chevron for inline accordion details

Expanded details reveal: website link, hours of operation, denomination (churches) or specialty keywords (counselors), full description, direct Google Maps directions link.

### Share Functionality

Same pattern as Prayer Wall:
- Desktop: dropdown with Copy Link, Email, SMS, Facebook, X
- Mobile: Web Share API with fallback dropdown
- Shared URL: deep link that opens the specific listing expanded

### Page-Specific Details

**Churches** (`/local-support/churches`):
- Search keyword: `"church"`
- Filter: Denomination dropdown (Baptist, Methodist, Non-denominational, Catholic, Presbyterian, Lutheran, Pentecostal, Episcopal, Church of Christ, Other) — best-effort keyword matching, accepted tradeoff
- Displays: name, address, phone, website, denomination (if inferable), service times (if available from hours), distance, rating, photo

**Counselors** (`/local-support/counselors`):
- Search keywords: `"Christian counselor"`, `"faith-based therapist"`, `"Christian therapist"` — intentionally targeted for faith-based practitioners
- Filter: Specialty dropdown (Grief, Anxiety, Depression, Addiction, Marriage, Trauma, Family, General) — best-effort keyword matching on description/reviews, accepted tradeoff
- Displays: name, address, phone, website, specialties (if inferable), distance, rating, photo, description
- Includes disclaimer near results: "Worship Room does not endorse or verify any counselor listed here. Please research any counselor before scheduling an appointment. If you are in crisis, call 988 (Suicide & Crisis Lifeline)."

**Celebrate Recovery** (`/local-support/celebrate-recovery`):
- Search keyword: `"Celebrate Recovery"`
- No filters — just show all nearby groups
- Hero section includes a brief explainer about what CR is (Christ-centered 12-step recovery program for hurts, habits, and hang-ups)
- Displays: church name hosting CR, address, phone, website, distance, rating, photo
- Generic spiritual/recovery imagery only — no official CR logo or branding

### Data Source & API Integration

**Phase 1 (Mock Data):** Complete frontend with mock/seed data. Mock data service returns realistic listings for all three categories. All UI interactions work with mock data. Map renders with real city coordinates (e.g., Columbia, TN or Nashville, TN).

**Phase 2 (Google Places API New):** Swap mock data layer for live Google Places API calls. Service abstraction layer ensures no frontend changes needed. Required APIs: Places API (New), Maps JavaScript API, Geocoding API. API key stored as environment variable (never committed).

**Caching:** 24-hour TTL on search results. Cache key: search keyword + coordinates (rounded to ~0.01 degree) + radius. Bookmarks stored separately, not reliant on cache.

### Empty States

| State | Behavior |
|-------|----------|
| Search not yet performed | Warm message with MapPin/Search icon encouraging location entry |
| Location denied | Fallback message with MapPinOff icon suggesting manual city/zip input |
| No results found | Compassionate message with SearchX icon suggesting expanded radius or different area |

### Error States

| Error | Behavior |
|-------|----------|
| Google API failure | Friendly message + Retry button |
| Geocoding failure | "We couldn't find that location" + suggest different input |
| Geolocation timeout | Fall back to manual entry with message |

### Loading States

- Skeleton loaders matching listing card layout (same pattern as Prayer Wall)
- Map area: loading spinner until Google Maps initializes
- Skeleton cards in list while fetching results

### Sorting

| Option | Behavior |
|--------|----------|
| Distance (default) | Closest first |
| Rating | Highest Google star rating first; unrated items sort to bottom |
| Alphabetical | A-Z by name |

Changing sort reorders current results client-side (no new API call).

### Cross-Page Behavior

- No state sharing between pages — navigating from Churches to Counselors starts fresh
- Bookmarks scoped per category — Saved tab on Churches shows only saved churches, etc.

## Acceptance Criteria

- [ ] Nav dropdown updated to show Churches, Counselors, Celebrate Recovery (desktop + mobile)
- [ ] Routes change from `/churches` and `/counselors` to `/local-support/churches`, `/local-support/counselors`, and new `/local-support/celebrate-recovery`
- [ ] Three separate routes render correctly
- [ ] Logged-out users see hero section + "Sign In to Search" CTA on all three pages
- [ ] Auth modal appears when logged-out user clicks CTA (not a redirect to `/login`)
- [ ] Logged-in users see full search UI: location input, geolocation button, radius slider, results area
- [ ] "Use My Location" triggers browser geolocation; denied permission falls back gracefully
- [ ] City/zip input resolves to coordinates (mock geocoding for Phase 1)
- [ ] Radius slider works 1-100 miles with labels, default 25
- [ ] Desktop: list (left) + map (right) side-by-side
- [ ] Mobile: list/map toggle (not stacked)
- [ ] Listing cards show all required fields with expand arrow for inline details
- [ ] Map pins sync with list (click pin scrolls list, click card highlights pin)
- [ ] Sort dropdown works: Distance, Rating, Alphabetical
- [ ] "Load More" pagination works
- [ ] Bookmark toggle works; saved items appear in Saved tab with map
- [ ] Share functionality: copy link, email, SMS, Facebook, X (desktop dropdown, mobile Web Share API)
- [ ] URL reflects search parameters; shared URLs auto-execute search
- [ ] Churches page: denomination filter works (best-effort)
- [ ] Counselors page: specialty filter works (best-effort)
- [ ] Counselors page: search targets Christian-specific keywords
- [ ] Counselors page: disclaimer displayed near results
- [ ] CR page: explainer about Celebrate Recovery in hero
- [ ] CR page: no official CR branding used
- [ ] All empty states render with icons and warm messaging
- [ ] Error states show friendly messages with retry
- [ ] Loading states use skeleton loaders and spinner
- [ ] Hero sections match existing purple gradient style
- [ ] Responsive at all breakpoints (mobile, tablet, desktop)
- [ ] All interactive elements keyboard accessible
- [ ] Mock data service with realistic seed data for all categories
- [ ] Service abstraction layer for mock-to-Google-API swap
- [ ] Google API key environment variable placeholder exists
- [ ] No cross-page state carry-over
- [ ] Frontend tests cover major interactions

## UX & Design Notes

- **Tone**: Warm, encouraging, compassionate — connecting users with real-world support as part of their healing journey
- **Hero Sections**: Purple gradient (`#0D0620` to `#6D28D9`), white text, Inter Bold 700 headings, matching Home and Prayer Wall heroes
- **Results Area**: Neutral background (`#F5F5F5`), white cards with subtle shadow, consistent with Prayer Wall card styling
- **Typography**: Inter for all UI text (body 400/500, headings 600/700)
- **Colors**: Primary violet (`#6D28D9`) for interactive elements and action buttons. Success green (`#27AE60`) for bookmarked state. Standard Google Maps styling for the map.
- **Icons**: Lucide React throughout (no custom illustrations)
- **Responsive**: Mobile-first. Mobile (< 640px): list/map toggle, full-width cards. Tablet (640-1024px): padded cards, inline interaction elements. Desktop (> 1024px): side-by-side list + map layout.
- **Animations**: Smooth accordion expand for card details, gentle transitions consistent with the rest of the app
- **Map + List Sync**: Clicking a map pin scrolls and highlights the corresponding list card. Clicking a list card bounces the corresponding map pin.
- **Celebrate Recovery**: Generic spiritual/recovery imagery only. No official CR logo or trademarked branding elements.

## AI Safety Considerations

- **Crisis detection needed?**: No — users enter location data (cities, zip codes), not emotional content
- **User input involved?**: Yes — location search queries only (city names, zip codes, geolocation coordinates). No free-text emotional input.
- **AI-generated content?**: No — all content comes from Google Places API or static copy written at build time
- **Counselor disclaimer**: The Counselors page must include a disclaimer near search results stating Worship Room does not endorse or verify listed counselors, with a crisis hotline reference (988)
- **No moderation needed**: No user-generated content on these pages (no comments, reviews, or text submissions)
- **Crisis resources**: Not displayed on Local Support pages specifically (per product decision). Crisis resources remain in the site footer and on pages where users express emotional content.

## Auth & Persistence

- **Logged-out (demo mode)**: Can view hero/intro section only. No search, no results, no bookmarks. Zero database writes. Zero persistence. CTA opens auth modal.
- **Logged-in**: Full access to search, results, map, bookmarks, sharing. Bookmarks stored in database (associated with user ID). Search history not persisted — each visit starts fresh. Cached search results (24-hour TTL) served for repeated identical searches.
- **Route type**: Public (all three pages accessible by anyone — search functionality soft-gated behind auth)

## Out of Scope

- No ratings, reviews, or recommendations from Worship Room users (no UGC on these pages)
- No "Suggest a listing" or "Claim this listing" flow
- No church/counselor owner accounts or listing management
- No admin tools for managing listings
- No in-person vs. telehealth filter for counselors (Google Places lacks this data)
- No structured credentials/licenses for counselors (not reliably available)
- No meeting day/time for Celebrate Recovery (not reliably available from Google Places)
- No crisis detection on search inputs (users enter locations, not emotional content)
- No parent `/local-support` landing page (nav dropdown is the only entry point)
- No state/radius sharing between the three pages
- No landing page AI search login gate (separate spec)
- No multi-language support (English only for MVP)
- No custom map pin icons per category
- No official Celebrate Recovery branding/logo
- No real-time WebSocket updates
- No offline/PWA support
