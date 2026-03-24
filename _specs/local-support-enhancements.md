# Feature: Local Support Enhancements

## Overview

The Local Support pages (Churches, Counselors, Celebrate Recovery) currently gate location search behind authentication — a friction point flagged in the competitive analysis and frontend audit. Searching for a church or counselor near you is not a personal data action; it's the same as searching Google Maps. The browser's own geolocation permission prompt is the user's consent gate, not our auth system.

This enhancement addresses three friction points:
1. **Remove unnecessary auth gates on search** — let all users search by location, keeping auth only on bookmarking and visit tracking
2. **Add cross-feature CTAs to listing cards** — contextual links to Pray, Journal, and Prayer Wall from expanded listing details, connecting real-world support with Worship Room's digital healing tools
3. **Add "I visited" check-in** — let logged-in users track visits to local support locations, earn faith points, and see community connection stats on their Insights page

These changes transform Local Support from a gated utility into a welcoming bridge between Worship Room's digital experience and real-world healing communities.

## User Stories

- As a **logged-out visitor**, I want to search for churches, counselors, and Celebrate Recovery groups near my location so I can find real-world support without needing to create an account first.
- As a **logged-in user**, I want to see contextual action links on listing cards so I can easily pray for a church, journal about a counseling session, or find a recovery meeting buddy.
- As a **logged-in user**, I want to check in when I visit a local support location so I can track my community connections and earn faith points for engaging with real-world support.
- As a **logged-in user**, I want to see how my local support visits correlate with my mood on the Insights page so I can understand how community engagement affects my well-being.

## Requirements

### 1. Auth Gate Changes

**Remove auth gating from:**
- Geolocation "Use My Location" button (browser permission prompt is the user's consent)
- Text-based city/zip code search input and Search button
- Radius slider (1-100 miles)
- Sort controls (Distance, Rating, Alphabetical)
- List/Map view toggle
- All listing card content (name, address, phone, directions, hours, website, denomination, specialties, description)
- "Load More" pagination

**Keep auth gating on:**
- Bookmark toggle button — logged-out click opens auth modal: "Sign in to bookmark listings"
- Saved tab — logged-out click opens auth modal: "Sign in to save and view bookmarked listings"
- "I visited" check-in button (new feature, see section 3)

**Logged-out search experience:**
- Logged-out users see the full page: hero section, search controls, results area (map + list)
- Search controls are fully interactive — geolocation, text input, radius slider, sort, all functional
- Mock data service returns results for logged-out users the same as logged-in users
- URL parameters (`?lat=...&lng=...&radius=...`) work for all users (shared links open with results)
- The only visual difference for logged-out users: no bookmark button, no "I visited" button, no Saved tab

**Logged-in search experience:**
- Same as logged-out plus: bookmark toggle on listing cards, Saved tab, "I visited" button on listing cards

### 2. Cross-Feature CTAs on Listing Cards

When a user expands a listing card's details section, show contextual action links at the bottom of the expanded details area, below the existing "Get Directions" button.

**Churches — 3 CTAs:**
- "Pray for this church" — navigates to `/daily?tab=pray&context=Praying+for+[Church+Name]`
- "Journal about your visit" — navigates to `/daily?tab=journal&prompt=Reflect+on+your+experience+at+[Church+Name]...`
- "Share with a friend" — triggers existing share functionality for this listing

**Counselors — 3 CTAs:**
- "Pray before your appointment" — navigates to `/daily?tab=pray&context=Preparing+to+meet+with+a+counselor...`
- "Journal about your session" — navigates to `/daily?tab=journal&prompt=After+my+counseling+session,+I+feel...`
- "Share with a friend" — triggers existing share functionality

**Celebrate Recovery — 3 CTAs:**
- "Pray for your recovery journey" — navigates to `/daily?tab=pray&context=Praying+for+strength+in+my+recovery+journey`
- "Journal your progress" — navigates to `/daily?tab=journal&prompt=Reflecting+on+my+recovery+journey+today...`
- "Find a meeting buddy" — navigates to `/prayer-wall?template=cr-buddy` (the Prayer Wall page reads the template param and pre-fills the composer with a suggested post: "Looking for a Celebrate Recovery meeting buddy near [location]...")

**CTA behavior:**
- All CTAs work for ALL users (logged-in and logged-out) — they navigate to public pages
- The Pray and Journal features will show their own auth gates when the user tries to generate/save content
- The Prayer Wall composer will show its own auth gate when the user tries to post
- Each CTA renders as a text link with a small right-arrow icon (Lucide `ArrowRight`, 14px)
- The "Share with a friend" CTA reuses the existing share dropdown functionality already on listing cards

**CTA styling:**
- `text-sm text-primary-lt hover:text-primary` with `ArrowRight` icon
- Matches the cross-feature CTA pattern used elsewhere (e.g., Pray tab → Journal CTA, Prayer Wall → Pray CTA)
- Separated from listing details by a subtle top border (`border-t border-gray-200`)

### Prerequisite: URL Parameter Context for Pray and Journal Tabs

The cross-feature CTAs navigate to `/daily?tab=pray&context=...` and `/daily?tab=journal&prompt=...`. Currently, the Pray and Journal tabs receive cross-tab context via React state within DailyHub (the `PrayContext` pattern), which only works for intra-page tab switches.

For CTAs from external pages (Local Support → Daily Hub), the DailyHub must be updated to:
1. Read `context` and `prompt` URL search params on mount
2. Pass `context` to PrayTabContent as initial textarea content or context header
3. Pass `prompt` to JournalTabContent as an initial guided prompt (same as the existing `contextPrompt` mechanism)

This is a small addition to `DailyHub.tsx` — reading two URL params and wiring them to existing prop/state patterns. It enables cross-feature CTAs from any page in the app, not just Local Support.

### 3. "I Visited" Check-In Feature

**Button placement:** In the listing card header area, next to the existing bookmark button. Uses a ghost button style.

**Default state (not visited today):**
- Lucide `MapPin` icon + "I visited" text
- Ghost button style matching existing action buttons in the card header

**After clicking:**
- Button changes to green checkmark (Lucide `Check`) + "Visited [date]" text in success green (`#27AE60`)
- An optional note field expands below the button: "How was your experience?" textarea (300 character max)
- Note auto-saves on blur or after 1 second of inactivity (debounced)
- Users can log multiple visits to the same location on different dates

**Data model — new localStorage key `wr_local_visits`:**
```
Array of objects:
{
  id: string (UUID)
  placeId: string (from listing)
  placeName: string
  placeType: 'church' | 'counselor' | 'cr'
  visitDate: string (YYYY-MM-DD, local date)
  note: string (optional, max 300 chars)
}
```

**Storage rules:**
- Max 500 entries; when exceeded, prune oldest entries first
- Corrupted data recovery: if JSON parse fails, reset to empty array
- Typed interfaces matching existing `StorageService` patterns
- Pure functions for all operations (add, get, getByPlace, getByDate, remove)

**Auth gating:**
- "I visited" button is ONLY visible to logged-in users
- Logged-out users do not see the button at all (not a grayed-out or auth-modal-gated button — simply hidden)
- `recordActivity('localVisit')` no-ops when not authenticated (existing pattern)

### 4. Faith Points Integration

- New activity type: `localVisit`
- Points value: 10 (same as `pray` and `listen`)
- Display name: "Visited local support"
- Checklist name: "Visit local support"
- Recording: `recordActivity('localVisit')` called when user clicks "I visited" on any listing
- One recording per day (existing idempotency in `recordActivity`)

**Activity Checklist behavior:**
- "Visit local support" item is **conditional** — only visible in the Activity Checklist when the user has at least one entry in `wr_local_visits` (has visited any location in their history)
- Users who have never used local support do not see this checklist item
- Once visible, it follows the same check/uncheck pattern as all other activities

### 5. Insights Page Integration

On the `/insights` page, in the Activity Correlations section, add a "Community Connections" stat:

**Display:**
- "You've visited X local support locations" (total unique places visited)
- Breakdown by type: "Y churches, Z counselors, W CR meetings"
- If the user has visits with mood data on the same dates: "On days you visited local support, your mood averaged X.X" — using the same correlation calculation pattern as existing activity correlations

**Visibility:**
- Only shown when the user has at least one entry in `wr_local_visits`
- If no visits exist, the section does not render (no empty state needed — it's an additional stat, not a standalone section)

## Auth Gating Summary

| Element | Logged-Out | Logged-In |
|---------|-----------|-----------|
| Hero section | Visible | Visible |
| Search controls (geolocation, text, radius) | **Fully functional** | Fully functional |
| Sort controls | **Fully functional** | Fully functional |
| List/Map toggle | **Fully functional** | Fully functional |
| Listing card content (all fields) | **Visible** | Visible |
| Listing card expanded details | **Visible** | Visible |
| Cross-feature CTAs | **Visible and clickable** | Visible and clickable |
| "Get Directions" link | **Functional** | Functional |
| Bookmark button | Hidden | Visible (auth-gated toggle) |
| Saved tab | Hidden | Visible |
| "I visited" button | Hidden | Visible |
| Share button | **Functional** | Functional |

## Responsive Behavior

### Mobile (< 640px)
- Cross-feature CTAs stack vertically in a single column below listing details
- Each CTA is a full-width tap target (min 44px height)
- "I visited" button remains in card header row, icon-only on very small screens (text hidden below ~400px with `sr-only` label)
- Note textarea expands full-width below the card header

### Tablet (640px - 1024px)
- Cross-feature CTAs display in a 2-column grid below listing details
- "I visited" button shows full icon + text in card header
- Note textarea width matches card content width

### Desktop (> 1024px)
- Cross-feature CTAs display in a horizontal row (3 items side by side) below listing details
- "I visited" button shows full icon + text in card header
- Note textarea width constrained to ~60% of card width

## UX & Design Notes

- **Tone**: Warm, encouraging — the CTAs and check-in feature are about celebrating community engagement, not tracking attendance
- **Cross-feature CTA styling**: `text-sm text-primary-lt hover:text-primary` with small `ArrowRight` icon (14px). Separated from details by `border-t border-gray-200`. Matches existing cross-feature CTA patterns.
- **"I visited" button default**: Ghost button style — `text-sm text-text-light hover:text-primary border border-gray-200 rounded-lg px-3 py-1.5`. Matches existing action button sizing in card headers.
- **"I visited" confirmed state**: `text-sm text-success` with `Check` icon. Subtle, celebratory but not loud.
- **Note textarea**: Standard textarea matching existing patterns — `border border-gray-200 rounded-lg p-3 text-sm`. Placeholder: "How was your experience? (optional)". Character count shown below.
- **Colors**: Primary violet (`#6D28D9`) and primary light (`#8B5CF6`) for CTAs. Success green (`#27AE60`) for visited state.
- **Typography**: Inter for all text. CTAs use `text-sm` (14px). "I visited" button uses `text-sm`.
- **Animations**: Smooth expand for note textarea (matching existing card accordion animation). No animation on CTA links — they're simple navigations.
- **Design system recon reference**: Card pattern matches existing Local Support listing cards captured in `_plans/recon/design-system.md`. Inner Page Hero gradient already used on all three Local Support pages.

## AI Safety Considerations

- **Crisis detection needed?**: No — this enhancement adds navigation links and visit tracking. No new user text input beyond an optional 300-character visit note ("How was your experience?"). Visit notes are experience reflections, not emotional crisis content. The Journal and Pray pages handle their own crisis detection when users navigate there via CTAs.
- **User input involved?**: Yes — optional visit note (300 chars max). This is a brief experience note (e.g., "Great sermon today" or "First meeting, everyone was welcoming"). Not classified as emotional crisis-risk input. Standard input length validation applies.
- **AI-generated content?**: No — all content is static navigation links and user-entered notes.
- **Counselor disclaimer**: Already exists on the Counselors page — no changes needed.
- **Crisis resources**: Remain in the site footer on all pages. No additional crisis resources needed for this enhancement.

## Auth & Persistence

- **Logged-out (demo mode)**: Full search and browse experience. Can view all listing details and cross-feature CTAs. Cannot bookmark, cannot check in visits. Zero data persistence for logged-out users. No cookies, no anonymous IDs.
- **Logged-in**: Full search + bookmarks (existing, localStorage) + visit check-in (`wr_local_visits` localStorage) + faith points recording. All localStorage writes auth-gated.
- **Route type**: Public (all three pages remain publicly accessible)
- **New localStorage key**: `wr_local_visits` — visit tracking data (max 500 entries)
- **Modified localStorage keys**: `wr_daily_activities` (new `localVisit` activity flag), `wr_faith_points` (points from visit activity)

## Acceptance Criteria

### Auth Gate Changes
- [ ] Logged-out user can use "Use My Location" geolocation button and receives browser permission prompt
- [ ] Logged-out user can type a city/zip code in the search input and click Search to see results
- [ ] Logged-out user can adjust the radius slider (1-100 miles) and results update
- [ ] Logged-out user can use sort controls (Distance, Rating, Alphabetical)
- [ ] Logged-out user can toggle between List View and Map View (mobile)
- [ ] Logged-out user can expand listing card details (address, phone, hours, website, directions)
- [ ] Logged-out user can click "Get Directions" to open Google Maps
- [ ] Logged-out user does NOT see the bookmark button on listing cards
- [ ] Logged-out user does NOT see the Saved tab
- [ ] Logged-out user does NOT see the "I visited" button
- [ ] Logged-in user sees bookmark button, Saved tab, and "I visited" button
- [ ] Shared URL with search params (`?lat=...&lng=...&radius=...`) works for logged-out users

### Cross-Feature CTAs
- [ ] Navigating to `/daily?tab=pray&context=...` pre-fills the Pray tab with the context text
- [ ] Navigating to `/daily?tab=journal&prompt=...` sets the Journal tab's guided prompt to the provided text
- [ ] Expanding a church listing shows 3 CTAs: "Pray for this church", "Journal about your visit", "Share with a friend"
- [ ] Expanding a counselor listing shows 3 CTAs: "Pray before your appointment", "Journal about your session", "Share with a friend"
- [ ] Expanding a Celebrate Recovery listing shows 3 CTAs: "Pray for your recovery journey", "Journal your progress", "Find a meeting buddy"
- [ ] "Pray..." CTAs navigate to `/daily?tab=pray` with appropriate context parameter
- [ ] "Journal..." CTAs navigate to `/daily?tab=journal` with appropriate prompt parameter
- [ ] "Find a meeting buddy" navigates to `/prayer-wall` with template parameter
- [ ] "Share with a friend" triggers the existing share functionality
- [ ] All CTAs work for both logged-out and logged-in users (navigation to public pages)
- [ ] CTAs use `text-sm text-primary-lt hover:text-primary` styling with `ArrowRight` icon
- [ ] CTAs are separated from listing details by a `border-t border-gray-200` divider
- [ ] On mobile (< 640px), CTAs stack vertically with 44px minimum tap targets
- [ ] On tablet (640-1024px), CTAs display in a 2-column grid
- [ ] On desktop (> 1024px), CTAs display in a horizontal row

### "I Visited" Check-In
- [ ] "I visited" button appears in listing card header next to bookmark button (logged-in only)
- [ ] Clicking "I visited" changes button to green check + "Visited [date]" text
- [ ] After clicking, an optional note textarea expands: "How was your experience?" (300 char max)
- [ ] Note auto-saves on blur or after 1 second debounce
- [ ] Multiple visits to the same location on different dates are supported
- [ ] Visit data persists in `wr_local_visits` localStorage key
- [ ] Storage handles corrupted data gracefully (resets to empty array)
- [ ] Storage prunes oldest entries when exceeding 500 max

### Faith Points Integration
- [ ] Clicking "I visited" records `localVisit` activity via `recordActivity('localVisit')`
- [ ] `localVisit` awards 10 faith points
- [ ] `localVisit` appears in Activity Checklist only after user has at least one visit in history
- [ ] Activity is idempotent (one recording per day, matching existing pattern)

### Insights Page Integration
- [ ] "Community Connections" stat appears on `/insights` when user has visits
- [ ] Shows total unique places visited with type breakdown (churches, counselors, CR meetings)
- [ ] Shows mood correlation on visit days (when mood data exists for those dates)
- [ ] Section does not render when user has no visits

### General
- [ ] All three Local Support pages (Churches, Counselors, Celebrate Recovery) reflect these changes
- [ ] Existing bookmark functionality continues to work for logged-in users
- [ ] Existing share functionality continues to work for all users
- [ ] No regressions to existing Local Support features
- [ ] Frontend tests cover auth gate changes, CTA navigation, visit check-in, and faith points

## Out of Scope

- No backend API changes — all persistence is localStorage (Phase 2 frontend-first pattern)
- No real Google Places API integration — continues using mock data service
- No visit history page or dedicated visit management UI beyond the listing card button and Insights stat
- No social sharing of visits (e.g., "Eric visited Grace Church" on friend feed)
- No visit reminders or notifications (e.g., "You haven't visited a church in 2 weeks")
- No visit verification (honor system — no geofencing or check-in radius)
- No admin moderation of visit notes
- No visit notes visible to other users (private to the visiting user)
- No changes to the Prayer Wall composer to auto-populate from the `template` URL parameter (that would be a separate enhancement; for now, the param is a placeholder for future use)
- No new routes — all changes are within existing Local Support pages and the Insights page
- No multi-language support
- No offline/PWA support for visit tracking
