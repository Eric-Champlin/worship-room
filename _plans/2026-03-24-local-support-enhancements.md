# Implementation Plan: Local Support Enhancements

**Spec:** `_specs/local-support-enhancements.md`
**Date:** 2026-03-24
**Branch:** `claude/feature/local-support-enhancements`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Relevant Existing Files and Patterns

**Local Support Pages (thin wrappers):**
- `frontend/src/pages/Churches.tsx` — passes config to `LocalSupportPage`
- `frontend/src/pages/Counselors.tsx` — passes config to `LocalSupportPage`
- `frontend/src/pages/CelebrateRecovery.tsx` — passes config to `LocalSupportPage`

**Local Support Components:**
- `frontend/src/components/local-support/LocalSupportPage.tsx` — orchestrator (444 lines). Manages search state, bookmarks, tabs, results. Auth gates search via `onInteractionBlocked` callback passed to `SearchControls`.
- `frontend/src/components/local-support/SearchControls.tsx` — geolocation button, text input, radius slider. When `onInteractionBlocked` is set, all interactions fire that callback instead of searching.
- `frontend/src/components/local-support/ResultsList.tsx` — sorts, filters, renders `ListingCard`s. Manages expand/share state. Passes `onToggleBookmark` and `onShare` through to cards.
- `frontend/src/components/local-support/ListingCard.tsx` — card with header (name, distance, address, phone, rating), actions row (bookmark, share, expand/collapse), expanded details (website, hours, denomination/specialties, description, Get Directions).
- `frontend/src/components/local-support/ListingShareDropdown.tsx` — share UI for each card.

**Current Auth Gating Pattern in Local Support:**
- `LocalSupportPage.tsx` line 39: `const { isAuthenticated } = useAuth()`
- Line 44-48: Logged-out users get mock data + MOCK_DATA_CENTER coords. Logged-in users start with empty results (must search).
- Line 245-253: `SearchControls` receives `onInteractionBlocked` when `!isAuthenticated` — this blocks ALL search interactions for logged-out users.
- Line 173: Bookmark toggle checks `isAuthenticated` and shows auth modal if false.
- Line 269-271: Saved tab click checks `isAuthenticated` and shows auth modal if false.

**Daily Hub / Tab Context:**
- `frontend/src/pages/DailyHub.tsx` — reads `?tab=` from URL. Passes `prayContext` to JournalTabContent via state. **Does NOT currently read `context` or `prompt` URL params.**
- `PrayTabContent.tsx` — reads `prayWallContext` from `location.state`. Takes `onSwitchToJournal` callback.
- `JournalTabContent.tsx` — receives `prayContext` prop. Also reads `prayWallContext` from `location.state`. Has `contextPrompt` state for guided mode prompt override.

**Gamification System:**
- `frontend/src/types/dashboard.ts` line 15: `ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal' | 'readingPlan' | 'gratitude' | 'reflection' | 'challenge'`
- `frontend/src/constants/dashboard/activity-points.ts` — `ACTIVITY_POINTS`, `ACTIVITY_DISPLAY_NAMES`, `ACTIVITY_CHECKLIST_NAMES`, `ALL_ACTIVITY_TYPES`
- `frontend/src/hooks/useFaithPoints.ts` — `recordActivity(type)` with idempotency check. Returns no-ops when `!isAuthenticated`.
- `frontend/src/components/dashboard/ActivityChecklist.tsx` — renders checklist items from `BASE_ACTIVITY_ORDER`. Conditionally shows `readingPlan` and `reflection`. Uses `ActivityType` for typing.
- `frontend/src/services/faith-points-storage.ts` — `freshDailyActivities()`, `getActivityLog()`, `calculateDailyPoints()`, `persistAll()`.

**Insights Page:**
- `frontend/src/pages/Insights.tsx` — dark themed, auth-gated. Renders `ActivityCorrelations` component among others. Uses `AnimatedSection` wrappers with staggered index.
- `frontend/src/components/insights/ActivityCorrelations.tsx` — bar chart showing mock correlation data. Has `hasData` prop.

**Test Patterns:**
- Provider wrapping: `MemoryRouter` + `ToastProvider` + `AuthModalProvider`
- Auth mock: `vi.mock('@/hooks/useAuth', ...)`
- Component tests: Vitest + React Testing Library + user-event
- ListingCard tests: direct render with mock place object

**Cross-Feature CTA Pattern (existing):**
- Prayer Wall `CommentsSection.tsx`: `<Link to="/daily?tab=pray" state={{ prayWallContext: ... }} className="text-sm text-primary-lt transition-colors hover:text-primary">Pray about this &rarr;</Link>`
- Pray tab `PrayTabContent.tsx`: "Journal about this &rarr;" button calling `onSwitchToJournal(topic)`

---

## Auth Gating Checklist

**Every action in the spec that requires login must have an auth check in the plan.**

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Search (geolocation, text, radius, sort) | **Remove** auth gate — open to all users | Step 1 | Remove `onInteractionBlocked` from SearchControls |
| Bookmark toggle | Keep auth gate — auth modal | Step 1 | Existing `handleToggleBookmark` check (unchanged) |
| Saved tab | Keep auth gate — auth modal | Step 1 | Existing tab click check (unchanged) |
| "I visited" button | Only visible to logged-in users | Step 4 | `isAuthenticated` check — hide button entirely |
| `recordActivity('localVisit')` | Auth-gated (no-op when not auth'd) | Step 3 | Existing `useFaithPoints` pattern |
| Bookmark button visibility | Hidden for logged-out | Step 1 | `isAuthenticated` conditional render |
| "I visited" button visibility | Hidden for logged-out | Step 4 | `isAuthenticated` conditional render |
| Saved tab visibility | Hidden for logged-out | Step 1 | `isAuthenticated` conditional render |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Cross-feature CTA text | color | `text-primary-lt` (#8B5CF6) | design-system.md |
| Cross-feature CTA hover | color | `hover:text-primary` (#6D28D9) | design-system.md |
| CTA icon (ArrowRight) | size | 14px | spec |
| CTA divider | border | `border-t border-gray-200` (1px solid #E5E7EB) | spec / design-system.md |
| "I visited" button (default) | style | `text-sm text-text-light hover:text-primary border border-gray-200 rounded-lg px-3 py-1.5` | spec |
| "I visited" button (confirmed) | color | `text-sm text-success` (#27AE60) + Check icon | spec |
| Note textarea | style | `border border-gray-200 rounded-lg p-3 text-sm` | spec |
| Listing card | existing | `rounded-xl border border-gray-200 bg-white p-5 sm:p-6` | ListingCard.tsx |
| Ghost button min-height | touch target | 44px min-h | accessibility standard |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses Caveat for script/highlighted headings, not Lora
- All hero sections use Inner Page Hero gradient for local support pages
- Cross-feature CTAs use `text-sm text-primary-lt hover:text-primary` (the Prayer Wall CTA pattern)
- Existing `&rarr;` in Prayer Wall CTAs — this spec uses Lucide `ArrowRight` icon instead
- ListingCard actions row: bookmark and share buttons are 44×44px touch targets with `min-h-[44px] min-w-[44px]`
- Auth modal subtitle pattern: `authModal?.openAuthModal('Sign in to [action]')`
- Dashboard cards use frosted glass (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`) — Insights page follows same pattern
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399

---

## Shared Data Models

### New TypeScript Interface: `LocalVisit`

```typescript
export interface LocalVisit {
  id: string           // crypto.randomUUID()
  placeId: string      // from LocalSupportPlace.id
  placeName: string    // from LocalSupportPlace.name
  placeType: 'church' | 'counselor' | 'cr'
  visitDate: string    // YYYY-MM-DD local date
  note: string         // optional, max 300 chars
}
```

### New `ActivityType` Addition: `localVisit`

```typescript
// Extend existing union:
export type ActivityType = '...' | 'localVisit'
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `wr_local_visits` | Write (new) | Array of LocalVisit objects, max 500 |
| `wr_daily_activities` | Write | New `localVisit` boolean flag |
| `wr_faith_points` | Write | Points from localVisit activity |
| `wr_streak` | Write | Streak update from localVisit activity |
| `wr_badges` | Write | Badge checks from localVisit activity |
| `worship-room-bookmarks-{category}` | Read/Write | Existing bookmark keys (no changes) |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px | CTAs stack vertically (single column, full-width, min-h-[44px]). "I visited" icon-only below ~400px. Note textarea full-width. |
| Tablet | 640px - 1024px | CTAs in 2-column grid. "I visited" icon + text. Note textarea card-width. |
| Desktop | > 1024px | CTAs in horizontal row (3 items). "I visited" icon + text. Note textarea ~60% card width. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Get Directions button → CTA divider | 12px (space-y-3 context) | ListingCard expanded details |
| CTA divider → CTA links | 12px (pt-3) | New section within expanded details |
| "I visited" button → note textarea | 8px (mt-2) | Card header expansion |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Spec is finalized and approved
- [x] Current branch is `claude/feature/local-support-enhancements`
- [x] All auth-gated actions from the spec are accounted for in the plan
- [x] Design system values are verified (from design-system.md recon)
- [ ] No [UNVERIFIED] values — all values from recon or codebase inspection
- [x] No master spec plan dependency
- [ ] `pnpm test` passes before starting

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Logged-out users: show mock data without search | Keep existing behavior: logged-out see mock data pre-loaded (category-filtered), logged-in start empty | Spec says "Logged-out users see the full page... Mock data service returns results for logged-out users the same as logged-in users." Current behavior already shows mock data for logged-out. We keep this but make search controls functional. |
| URL params for logged-out users | Support `?lat=...&lng=...&radius=...` for all users | Spec requires shared links to work for logged-out. Currently, initial coords only read when `isAuthenticated`. |
| `onInteractionBlocked` removal approach | Remove the prop entirely from SearchControls invocation for logged-out, but keep SearchControls interface backward-compatible | SearchControls already works fully when `onInteractionBlocked` is undefined |
| Mapping `LocalSupportCategory` to `LocalVisit.placeType` | `churches` → `church`, `counselors` → `counselor`, `celebrate-recovery` → `cr` | Spec defines placeType as shorter variants |
| ActivityChecklist conditional visibility | "Visit local support" only visible when `wr_local_visits` has ≥ 1 entry | Spec: "only visible in the Activity Checklist when the user has at least one entry" |
| `context` and `prompt` URL params in DailyHub | Read on mount, pass to respective tab content components | Spec requirement for cross-feature CTAs from external pages |
| Prayer Wall `?template=cr-buddy` | Out of scope per spec ("No changes to Prayer Wall composer to auto-populate from the template URL parameter") — navigate there, param is placeholder for future | Spec explicitly scopes this out |

---

## Implementation Steps

### Step 1: Remove Auth Gate from Search & Adjust Visibility

**Objective:** Make search controls fully functional for logged-out users. Hide bookmark button, Saved tab, and "I visited" button (added later) for logged-out users.

**Files to modify:**
- `frontend/src/components/local-support/LocalSupportPage.tsx` — remove `onInteractionBlocked` from SearchControls, change initial state for logged-out, hide bookmark/saved tab for logged-out
- `frontend/src/components/local-support/ListingCard.tsx` — make bookmark button conditionally visible via new prop
- `frontend/src/components/local-support/ResultsList.tsx` — pass new prop through to ListingCard

**Details:**

1. **`LocalSupportPage.tsx`** changes:
   - Line 44-48: Change logged-out initial state. Currently logged-out gets `getMockPlacesByCategory(config.category)` and `MOCK_DATA_CENTER` coords. Keep this behavior (pre-loads results) but also allow real searching.
   - Line 56-58: Change logged-out `searchState` from `'idle'` to `'success'` (it already does this).
   - Line 92-106: Allow URL params for logged-out users. Remove the `isAuthenticated ?` guards on `initialLat`, `initialLng`, `initialRadius`. All users can use URL params.
   - Line 245-253: Remove `onInteractionBlocked` prop entirely from `SearchControls`. When `onInteractionBlocked` is `undefined`, `SearchControls` already works fully (geolocation, text input, radius slider, all functional).
   - Line 257-301: Conditionally render the "Saved" tab button only when `isAuthenticated`. Replace the tabs array mapping with logic that shows both tabs for logged-in, only "Search Results" tab for logged-out.
   - Pass `showBookmark={isAuthenticated}` prop to `ResultsList` (both desktop and mobile instances).

2. **`ResultsList.tsx`** changes:
   - Add `showBookmark?: boolean` prop (default `true` for backward compat).
   - Pass `showBookmark` to each `ListingCard`.

3. **`ListingCard.tsx`** changes:
   - Add `showBookmark?: boolean` prop (default `true`).
   - Conditionally render the bookmark button only when `showBookmark` is true.

**Auth gating:**
- Bookmark button: hidden when `!isAuthenticated` (via `showBookmark={isAuthenticated}`)
- Saved tab: hidden when `!isAuthenticated` (conditionally rendered)
- Search controls: fully functional for all users (no `onInteractionBlocked`)

**Responsive behavior:**
- No responsive changes in this step — existing responsive layout preserved.

**Guardrails (DO NOT):**
- DO NOT remove the `handleToggleBookmark` auth check (line 173) — it stays as defense-in-depth
- DO NOT change the `BookmarkedIds` localStorage read/write auth checks (lines 68-89) — they remain auth-gated
- DO NOT break URL param sharing — logged-out users must be able to use shared URLs with `?lat=...&lng=...&radius=...`
- DO NOT show Saved tab or bookmark button to logged-out users

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Logged-out user sees search controls without auth gate | integration | Render Churches with mock logged-out auth. Verify "Use My Location" button is clickable, text input is not read-only, radius slider is interactive. |
| Logged-out user does not see bookmark button | integration | Render ListingCard with `showBookmark={false}`. Verify no bookmark button in DOM. |
| Logged-out user does not see Saved tab | integration | Render LocalSupportPage with mock logged-out. Verify only "Search Results" tab visible. |
| Logged-in user sees both tabs and bookmark | integration | Render with mock logged-in. Verify "Saved" tab and bookmark button present. |
| URL params work for logged-out user | integration | Render with `?lat=35.6&lng=-87.0&radius=25` and mock logged-out auth. Verify search auto-fires. |
| Existing bookmark functionality preserved | unit | Verify handleToggleBookmark still works for logged-in users. |

**Expected state after completion:**
- [ ] Logged-out users can search by location (geolocation + text input + radius)
- [ ] Logged-out users cannot see bookmark button, Saved tab
- [ ] Logged-in users see full feature set (unchanged)
- [ ] URL param deep links work for all users
- [ ] All existing tests pass (update as needed)

---

### Step 2: URL Parameter Context for DailyHub (Pray & Journal)

**Objective:** Enable DailyHub to read `context` and `prompt` URL search params and pass them to PrayTabContent and JournalTabContent, enabling cross-feature CTAs from external pages.

**Files to modify:**
- `frontend/src/pages/DailyHub.tsx` — read `context` and `prompt` from URL params, wire to tab components
- `frontend/src/components/daily/PrayTabContent.tsx` — accept optional `initialContext` prop
- `frontend/src/components/daily/JournalTabContent.tsx` — accept optional `urlPrompt` prop

**Details:**

1. **`DailyHub.tsx`** changes:
   - Read `context` param: `const urlContext = searchParams.get('context')` (after line 43)
   - Read `prompt` param: `const urlPrompt = searchParams.get('prompt')` (after above)
   - Pass `initialContext={urlContext}` to `PrayTabContent`
   - Pass `urlPrompt={urlPrompt}` to `JournalTabContent`
   - Clear the URL params after reading (to prevent re-triggering on tab switches): use a ref to track if params were consumed, clear from URL on first render via `setSearchParams` with just the `tab` param remaining.

2. **`PrayTabContent.tsx`** changes:
   - Add `initialContext?: string | null` to props interface
   - In the effect that manages initial text, if `initialContext` is set and textarea is empty, pre-fill the textarea with the decoded context string
   - This happens once on mount (similar to `prayWallContext` pattern but from URL instead of `location.state`)

3. **`JournalTabContent.tsx`** changes:
   - Add `urlPrompt?: string | null` to props interface
   - Add an effect: when `urlPrompt` is set, switch to `guided` mode and set `contextPrompt` to the decoded prompt string
   - This follows the same pattern as `prayWallContext` → `contextPrompt` (line 215-223)

**Auth gating:**
- None — DailyHub URL params work for all users. Auth gates fire when users try to generate/save.

**Responsive behavior:**
- No UI changes — this is data plumbing.

**Guardrails (DO NOT):**
- DO NOT break existing `prayContext` (intra-tab context) or `prayWallContext` (Prayer Wall → Daily Hub via location.state)
- DO NOT auto-submit or auto-generate — only pre-fill text/prompt
- DO NOT persist URL params after reading — clean them from the URL

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `?context=...` pre-fills Pray tab textarea | integration | Navigate to `/daily?tab=pray&context=Test+context`. Verify textarea contains "Test context". |
| `?prompt=...` sets Journal guided prompt | integration | Navigate to `/daily?tab=journal&prompt=Reflect+on...`. Verify journal is in guided mode with the prompt text. |
| Existing prayContext still works | regression | Verify onSwitchToJournal flow still works (state-based context). |
| URL params cleared after consumption | integration | Navigate with params, verify URL no longer contains `context`/`prompt` after mount. |

**Expected state after completion:**
- [ ] Navigating to `/daily?tab=pray&context=...` pre-fills the Pray textarea
- [ ] Navigating to `/daily?tab=journal&prompt=...` sets the Journal guided prompt
- [ ] Existing intra-tab context passing (PrayContext, prayWallContext) unaffected
- [ ] URL params cleaned after consumption

---

### Step 3: Add `localVisit` Activity Type to Gamification System

**Objective:** Register `localVisit` as a new activity type with 10 faith points. Make it conditional in the ActivityChecklist (only visible when user has visit history).

**Files to modify:**
- `frontend/src/types/dashboard.ts` — add `localVisit` to `ActivityType` union and `DailyActivities` interface
- `frontend/src/constants/dashboard/activity-points.ts` — add points (10), display name, checklist name, to `ALL_ACTIVITY_TYPES`
- `frontend/src/services/faith-points-storage.ts` — add `localVisit: false` to `freshDailyActivities()`
- `frontend/src/hooks/useFaithPoints.ts` — add `localVisit: false` to `DEFAULT_STATE.todayActivities` and `extractActivities`
- `frontend/src/components/dashboard/ActivityChecklist.tsx` — conditionally show `localVisit` item based on `wr_local_visits` presence

**Details:**

1. **`types/dashboard.ts`**:
   - Extend `ActivityType`: add `| 'localVisit'` to the union
   - Add `localVisit: boolean;` to `DailyActivities` interface

2. **`constants/dashboard/activity-points.ts`**:
   - `ACTIVITY_POINTS.localVisit = 10`
   - `ACTIVITY_DISPLAY_NAMES.localVisit = 'Visited local support'`
   - `ACTIVITY_CHECKLIST_NAMES.localVisit = 'Visit local support'`
   - Add `'localVisit'` to `ALL_ACTIVITY_TYPES` array
   - Update `MAX_DAILY_BASE_POINTS` from 135 to 145 (add 10)
   - Update `MAX_DAILY_POINTS` from 270 to 290 (145 × 2)

3. **`services/faith-points-storage.ts`**:
   - Add `localVisit: false` to `freshDailyActivities()` return

4. **`hooks/useFaithPoints.ts`**:
   - Add `localVisit: false` to `DEFAULT_STATE.todayActivities`
   - Add `localVisit: da.localVisit` to `extractActivities()`

5. **`components/dashboard/ActivityChecklist.tsx`**:
   - Import a helper to check if `wr_local_visits` has entries (use a direct localStorage check — simple one-liner)
   - Add `localVisit` to `activityList` conditionally: only include it when `localStorage.getItem('wr_local_visits')` parses to a non-empty array
   - Place it after `journal` in the display order (end of the base list, before conditional items like `reflection`)

**Auth gating:**
- `recordActivity('localVisit')` already no-ops when not authenticated (existing `useFaithPoints` pattern)
- ActivityChecklist only renders on the auth-gated Dashboard

**Responsive behavior:**
- No visual changes — just a new row in the checklist.

**Guardrails (DO NOT):**
- DO NOT change the existing activity types' point values
- DO NOT break the idempotency of `recordActivity` — it already handles this
- DO NOT make `localVisit` always visible in the checklist — it must be conditional

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `localVisit` in ACTIVITY_POINTS | unit | Verify `ACTIVITY_POINTS.localVisit === 10`. |
| `freshDailyActivities` includes localVisit | unit | Verify `freshDailyActivities().localVisit === false`. |
| `recordActivity('localVisit')` awards 10 points | unit | Mock auth, call `recordActivity('localVisit')`, verify points increase by 10. |
| ActivityChecklist shows localVisit when visits exist | unit | Set `wr_local_visits` in localStorage with entries. Render ActivityChecklist. Verify "Visit local support" item visible. |
| ActivityChecklist hides localVisit when no visits | unit | Ensure `wr_local_visits` is empty/missing. Render ActivityChecklist. Verify no "Visit local support" item. |
| Idempotency: second call same day is no-op | unit | Call `recordActivity('localVisit')` twice. Verify points only increase once. |

**Expected state after completion:**
- [ ] `localVisit` is a valid ActivityType
- [ ] 10 points awarded for `localVisit`
- [ ] ActivityChecklist conditionally shows "Visit local support"
- [ ] All existing gamification tests pass

---

### Step 4: Visit Storage Service & "I Visited" Button

**Objective:** Create the visit data model, storage utilities, and the "I visited" button component on listing cards.

**Files to create:**
- `frontend/src/services/local-visit-storage.ts` — pure functions for visit CRUD
- `frontend/src/components/local-support/VisitButton.tsx` — "I visited" button component

**Files to modify:**
- `frontend/src/components/local-support/ListingCard.tsx` — add VisitButton to card header actions
- `frontend/src/components/local-support/ResultsList.tsx` — pass `isAuthenticated` and visit handler props through
- `frontend/src/components/local-support/LocalSupportPage.tsx` — manage visit state and pass handlers

**Details:**

1. **`services/local-visit-storage.ts`** (new file):
   ```typescript
   export interface LocalVisit {
     id: string
     placeId: string
     placeName: string
     placeType: 'church' | 'counselor' | 'cr'
     visitDate: string  // YYYY-MM-DD
     note: string
   }

   const STORAGE_KEY = 'wr_local_visits'
   const MAX_ENTRIES = 500

   export function getVisits(): LocalVisit[] { ... }
   export function getVisitsByPlace(placeId: string): LocalVisit[] { ... }
   export function getVisitsByDate(date: string): LocalVisit[] { ... }
   export function hasVisitedToday(placeId: string): boolean { ... }
   export function addVisit(visit: Omit<LocalVisit, 'id'>): LocalVisit { ... }
   export function updateVisitNote(visitId: string, note: string): void { ... }
   export function removeVisit(visitId: string): void { ... }
   export function getUniqueVisitedPlaces(): { total: number; churches: number; counselors: number; cr: number } { ... }
   export function categoryToPlaceType(cat: LocalSupportCategory): 'church' | 'counselor' | 'cr' { ... }
   ```
   - `getVisits()`: JSON parse with try/catch, return `[]` on corruption
   - `addVisit()`: prepend, prune if > 500 (remove oldest), use `crypto.randomUUID()` for id
   - Storage rules: max 500, corrupted data → reset to empty, all pure functions

2. **`components/local-support/VisitButton.tsx`** (new file):
   - Props: `{ placeId, placeName, placeType, onVisit }`
   - State: `hasVisitedToday` (from storage), `showNote` (boolean), `note` (string), `savedVisitId` (string | null)
   - Default: Ghost button — `MapPin` icon + "I visited" text
   - After click: Green check + "Visited [today's date]", note textarea expands
   - Note textarea: "How was your experience?" placeholder, 300 char max, char counter, auto-save on blur and 1s debounce
   - Calls `onVisit()` callback on click (parent handles `recordActivity`)
   - Mobile: text hidden below 400px via `hidden xs:inline` (with `sr-only` label for accessibility)
   - Button styling: `text-sm text-text-light hover:text-primary border border-gray-200 rounded-lg px-3 py-1.5 min-h-[44px]`
   - Confirmed styling: `text-sm text-success` with `Check` icon

3. **`ListingCard.tsx`** changes:
   - Add props: `showVisitButton?: boolean`, `onVisit?: (placeId: string, placeName: string) => void`, `placeType?: 'church' | 'counselor' | 'cr'`
   - In the actions row (between bookmark and expand buttons), render `<VisitButton>` when `showVisitButton` is true
   - Pass through `placeId`, `placeName`, `placeType`, and `onVisit` callback

4. **`ResultsList.tsx`** changes:
   - Add props: `showVisitButton?: boolean`, `onVisit?: (placeId: string, placeName: string) => void`, `placeType?: 'church' | 'counselor' | 'cr'`
   - Pass through to each `ListingCard`

5. **`LocalSupportPage.tsx`** changes:
   - Create `handleVisit` callback: calls `recordActivity('localVisit')` from `useFaithPoints`, calls `addVisit()` from storage service
   - Map `config.category` to `placeType` using `categoryToPlaceType()`
   - Pass `showVisitButton={isAuthenticated}`, `onVisit={handleVisit}`, `placeType` to both `ResultsList` instances
   - Import `useFaithPoints` hook

**Auth gating:**
- `showVisitButton={isAuthenticated}` — button hidden for logged-out users
- `recordActivity('localVisit')` no-ops when not authenticated (defense-in-depth)

**Responsive behavior:**
- Mobile (< 400px): VisitButton shows icon only, text in `sr-only`
- Mobile (400-640px): icon + text
- Tablet/Desktop: icon + text
- Note textarea: full width mobile, ~60% card width on desktop (via `max-w-[60%]` on `lg:`)

**Guardrails (DO NOT):**
- DO NOT persist visits for logged-out users — button is hidden, but also guard `addVisit()` at the call site
- DO NOT allow notes longer than 300 characters
- DO NOT lose visit data on corruption — gracefully reset to `[]`
- DO NOT animate the note expansion if user prefers reduced motion

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `getVisits()` returns empty array on fresh start | unit | No localStorage key → returns `[]` |
| `getVisits()` handles corrupted JSON | unit | Set garbled data → returns `[]` |
| `addVisit()` creates entry with UUID | unit | Add visit, verify entry has id, correct placeId, etc. |
| `addVisit()` prunes when > 500 | unit | Add 501 entries, verify count stays at 500, oldest removed |
| `hasVisitedToday()` returns true after visit today | unit | Add today's visit, verify `hasVisitedToday` returns true |
| `updateVisitNote()` saves note | unit | Add visit, update note, verify note persisted |
| VisitButton renders "I visited" default state | component | Render with no prior visits, verify icon + text |
| VisitButton shows confirmed state after click | component | Click button, verify green check + "Visited" text |
| VisitButton expands note textarea on visit | component | Click, verify textarea appears with placeholder |
| VisitButton auto-saves note on blur | component | Click, type note, blur, verify storage updated |
| VisitButton hidden when showVisitButton=false | component | Render ListingCard with `showVisitButton={false}`, verify no visit button |
| VisitButton calls onVisit callback | component | Click, verify `onVisit` called with placeId and placeName |
| 300 char limit on note | component | Type 301 chars, verify limited to 300 |

**Expected state after completion:**
- [ ] Visit storage service with full CRUD operations
- [ ] "I visited" button on listing cards for logged-in users
- [ ] Visit records faith points via `recordActivity('localVisit')`
- [ ] Note auto-saves with debounce
- [ ] Button hidden for logged-out users

---

### Step 5: Cross-Feature CTAs on Listing Cards

**Objective:** Add contextual action links (Pray, Journal, Share/Find buddy) to the expanded details section of listing cards.

**Files to create:**
- `frontend/src/components/local-support/ListingCTAs.tsx` — CTA links component

**Files to modify:**
- `frontend/src/components/local-support/ListingCard.tsx` — render CTAs in expanded details
- `frontend/src/components/local-support/ResultsList.tsx` — pass category through to ListingCard

**Details:**

1. **`components/local-support/ListingCTAs.tsx`** (new file):
   - Props: `{ placeName: string, category: LocalSupportCategory, onShareClick: () => void }`
   - Returns a CTA section separated by `border-t border-gray-200` divider
   - Renders 3 CTAs per category as `<Link>` or `<button>` elements:

   **Churches:**
   - "Pray for this church" → `<Link to={`/daily?tab=pray&context=${encodeURIComponent(`Praying for ${placeName}`)}`}>`
   - "Journal about your visit" → `<Link to={`/daily?tab=journal&prompt=${encodeURIComponent(`Reflect on your experience at ${placeName}...`)}`}>`
   - "Share with a friend" → `<button onClick={onShareClick}>`

   **Counselors:**
   - "Pray before your appointment" → `<Link to={`/daily?tab=pray&context=${encodeURIComponent(`Preparing to meet with a counselor...`)}`}>`
   - "Journal about your session" → `<Link to={`/daily?tab=journal&prompt=${encodeURIComponent(`After my counseling session, I feel...`)}`}>`
   - "Share with a friend" → `<button onClick={onShareClick}>`

   **Celebrate Recovery:**
   - "Pray for your recovery journey" → `<Link to={`/daily?tab=pray&context=${encodeURIComponent(`Praying for strength in my recovery journey`)}`}>`
   - "Journal your progress" → `<Link to={`/daily?tab=journal&prompt=${encodeURIComponent(`Reflecting on my recovery journey today...`)}`}>`
   - "Find a meeting buddy" → `<Link to="/prayer-wall?template=cr-buddy">`

   - Each CTA: `<Link className="inline-flex items-center gap-1 text-sm text-primary-lt transition-colors hover:text-primary">` + `<ArrowRight size={14} />` at the end
   - "Share" CTA triggers the existing share handler (same as the current share button)

   - Responsive container:
     - Mobile (default): `flex flex-col gap-3` (stacked, min-h-[44px] per item)
     - Tablet (sm): `grid grid-cols-2 gap-3`
     - Desktop (lg): `flex flex-row gap-4`

2. **`ListingCard.tsx`** changes:
   - Add `category` prop (from `LocalSupportCategory`)
   - In the expanded details section, after the "Get Directions" link, render `<ListingCTAs>` with category, placeName, and share click handler
   - Pass `onShare` to the CTA for "Share with a friend"

3. **`ResultsList.tsx`** changes:
   - Already has `category` prop — pass it through to `ListingCard`

**Auth gating:**
- All CTAs work for ALL users (logged-in and logged-out) — they navigate to public pages
- Auth gates fire on the destination pages when users try to generate/save

**Responsive behavior:**
- Mobile (< 640px): CTAs stack vertically, full-width tap targets (min-h-[44px])
- Tablet (640-1024px): 2-column grid
- Desktop (> 1024px): horizontal row

**Guardrails (DO NOT):**
- DO NOT auth-gate any CTA — they link to public pages
- DO NOT use `dangerouslySetInnerHTML` for any content
- DO NOT hard-code URL paths without `encodeURIComponent` for dynamic segments
- DO NOT break the existing "Get Directions" link positioning

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Church CTAs render correctly | component | Render ListingCTAs with category="churches". Verify 3 CTAs with correct text. |
| Counselor CTAs render correctly | component | Render with category="counselors". Verify correct CTA text. |
| Celebrate Recovery CTAs render | component | Render with category="celebrate-recovery". Verify "Find a meeting buddy" links to prayer-wall. |
| Pray CTA links to correct URL | component | Verify "Pray for this church" href includes `/daily?tab=pray&context=...`. |
| Journal CTA links to correct URL | component | Verify "Journal about your visit" href includes `/daily?tab=journal&prompt=...`. |
| Share CTA calls onShareClick | component | Click "Share with a friend", verify callback fired. |
| CTAs visible for logged-out user | integration | Render expanded card with logged-out auth. Verify CTAs present. |
| CTAs stack on mobile | component | Render with viewport < 640px. Verify flex-col layout. |
| ArrowRight icon present | component | Verify each CTA has an ArrowRight icon. |
| CTA divider present | component | Verify `border-t border-gray-200` separator above CTAs. |

**Expected state after completion:**
- [ ] All three page types show correct CTAs when card is expanded
- [ ] CTAs navigate to correct Daily Hub URLs with context/prompt params
- [ ] "Share with a friend" reuses existing share functionality
- [ ] "Find a meeting buddy" navigates to Prayer Wall
- [ ] CTAs work for all users regardless of auth state

---

### Step 6: Insights Page — Community Connections Stat

**Objective:** Add a "Community Connections" section to the `/insights` page that shows visit stats and mood correlation, visible only when user has visit history.

**Files to create:**
- `frontend/src/components/insights/CommunityConnections.tsx` — stat display component

**Files to modify:**
- `frontend/src/pages/Insights.tsx` — add CommunityConnections to the section list

**Details:**

1. **`components/insights/CommunityConnections.tsx`** (new file):
   - Props: `{ hasData: boolean }` (mood data exists)
   - Reads `wr_local_visits` from localStorage via `getVisits()` and `getUniqueVisitedPlaces()` from storage service
   - If no visits exist, return `null` (component doesn't render)
   - Structure:
     - Section header: `MapPin` icon + "Community Connections" title (same pattern as ActivityCorrelations)
     - Frosted glass card: `rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6`
     - Main stat: "You've visited **X** local support locations" (total unique places)
     - Breakdown: "Y churches, Z counselors, W CR meetings" in `text-white/60`
     - Mood correlation (when `hasData` is true and visits exist on mood-tracked days): "On days you visited local support, your mood averaged **X.X**"
     - Mood correlation calculation: read `wr_mood_entries`, find entries where `entry.date` matches any visit date, calculate average mood value
   - No empty state needed — section simply doesn't render when no visits exist

2. **`pages/Insights.tsx`** changes:
   - Import `CommunityConnections`
   - Add it as an `AnimatedSection` in the content area, after `ActivityCorrelations` and before `GratitudeStreak`
   - Increment animation indices for all sections after it

**Auth gating:**
- `/insights` is already auth-gated (redirects to `/` when not authenticated) — no additional auth needed

**Responsive behavior:**
- Same as other Insights sections — frosted glass card, responsive padding `p-4 md:p-6`

**Guardrails (DO NOT):**
- DO NOT show the section when there are no visits (return `null`)
- DO NOT show mood correlation when there's no mood data for visit days
- DO NOT read visits in a way that could throw on corrupted data — use the safe `getVisits()` function

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Returns null when no visits | component | Render with empty localStorage. Verify nothing rendered. |
| Shows visit count and breakdown | component | Set mock visits in localStorage. Verify "You've visited X..." text. |
| Shows mood correlation when data exists | component | Set visits and mood entries on same dates. Verify average mood text. |
| Hides mood correlation when no overlap | component | Set visits on dates without mood entries. Verify no correlation text. |
| Renders in Insights page | integration | Navigate to /insights with mock visits. Verify section visible. |

**Expected state after completion:**
- [ ] Community Connections section appears on Insights when user has visits
- [ ] Shows total unique places with type breakdown
- [ ] Shows mood correlation when data exists
- [ ] Doesn't render when no visits (no empty state)

---

### Step 7: Integration Tests & Polish

**Objective:** End-to-end integration tests covering the complete user flows, plus any polish needed.

**Files to create:**
- `frontend/src/pages/__tests__/LocalSupportEnhancements.test.tsx` — integration tests for the full feature

**Files to modify:**
- Existing test files as needed for updated props/behavior

**Details:**

1. **Integration test scenarios:**
   - **Logged-out search flow:** Render Churches page logged-out → verify search controls functional → search → verify results → verify no bookmark/visit buttons → verify CTAs in expanded card → click CTA → verify navigation to Daily Hub with params
   - **Logged-in visit flow:** Render Churches page logged-in → expand card → click "I visited" → verify button state change → type note → blur → verify storage → verify `recordActivity('localVisit')` called
   - **Cross-feature CTA flow:** Expand card → click "Pray for this church" → verify navigation to `/daily?tab=pray&context=...`
   - **Insights integration:** Set visits in localStorage → render Insights → verify Community Connections section visible
   - **URL param sharing:** Navigate with `?lat=...&lng=...&radius=...` logged-out → verify results load

2. **Update existing tests:**
   - `Churches.test.tsx` — update for logged-out user seeing functional search controls (currently tests "teaser mode")
   - `ListingCard.test.tsx` — add tests for new props (`showBookmark`, `showVisitButton`, `category`, CTAs)
   - `SearchControls.test.tsx` — verify behavior without `onInteractionBlocked` prop
   - Update snapshot/assertion tests if component output changed

3. **Polish items:**
   - Verify smooth expand animation for note textarea
   - Verify focus management when "I visited" is clicked (focus moves to note textarea)
   - Verify `prefers-reduced-motion` is respected for note expansion
   - Verify all new interactive elements have accessible names and keyboard support

**Auth gating:**
- N/A — testing both auth states

**Responsive behavior:**
- Test responsive CTA layouts at mobile/tablet/desktop breakpoints

**Guardrails (DO NOT):**
- DO NOT skip testing the logged-out experience — it's the primary change
- DO NOT leave broken existing tests

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Full logged-out search + CTA flow | integration | End-to-end: search, expand card, verify CTAs, click navigate |
| Full logged-in visit flow | integration | Search, expand, "I visited", note, verify storage + points |
| All three page types work | integration | Churches, Counselors, CelebrateRecovery all render CTAs correctly |
| Insights Community Connections | integration | Mock visit data, render Insights, verify section |
| No regressions on existing features | regression | Run full test suite, verify all pass |

**Expected state after completion:**
- [ ] All new features have test coverage
- [ ] Existing tests updated for new behavior
- [ ] No regressions
- [ ] All acceptance criteria from spec are verified

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Remove auth gate from search, adjust visibility |
| 2 | — | URL parameter context for DailyHub |
| 3 | — | Add `localVisit` activity type to gamification |
| 4 | 3 | Visit storage service & "I visited" button (needs localVisit type) |
| 5 | 2 | Cross-feature CTAs on listing cards (needs URL param support) |
| 6 | 4 | Insights Community Connections (needs visit storage) |
| 7 | 1, 2, 3, 4, 5, 6 | Integration tests & polish (needs all features) |

**Note:** Steps 1, 2, and 3 are independent and can be implemented in any order (or in parallel). Step 4 depends on Step 3. Step 5 depends on Step 2. Step 6 depends on Step 4. Step 7 is the final integration step.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Remove auth gate from search & adjust visibility | [COMPLETE] | 2026-03-24 | Modified LocalSupportPage.tsx (removed onInteractionBlocked, opened URL params to all users with null guards, conditionally render Saved tab for auth'd users, pass showBookmark), ResultsList.tsx (added showBookmark prop passthrough), ListingCard.tsx (added showBookmark conditional render). Updated Churches.test.tsx (6 tests), ListingCard.test.tsx (+3 tests). Fixed pre-existing bug: Number(null)=0 passed validation for URL params. |
| 2 | URL parameter context for DailyHub | [COMPLETE] | 2026-03-24 | Modified DailyHub.tsx (read context/prompt URL params via refs, pass to tab components, clean after consumption), PrayTabContent.tsx (added initialContext prop + pre-fill effect), JournalTabContent.tsx (added urlPrompt prop + guided mode effect). Updated DailyHub.test.tsx (+3 tests). |
| 3 | Add `localVisit` activity type to gamification | [COMPLETE] | 2026-03-24 | Added `localVisit` to ActivityType union + DailyActivities interface, ACTIVITY_POINTS (10pts), display/checklist names, ALL_ACTIVITY_TYPES, freshDailyActivities, extractActivities, DEFAULT_STATE. Updated MAX_DAILY_BASE_POINTS 135→145, MAX_DAILY_POINTS 270→290. ActivityChecklist conditionally shows localVisit based on wr_local_visits localStorage. Updated 3 test files (activity-points, faith-points-storage, ActivityChecklist) with new counts + 5 new tests. |
| 4 | Visit storage service & "I visited" button | [COMPLETE] | 2026-03-24 | Created local-visit-storage.ts (LocalVisit interface, CRUD functions, categoryToPlaceType), VisitButton.tsx (ghost→confirmed state, note textarea with 300 char limit, debounced auto-save). Modified ListingCard.tsx (showVisitButton/onVisit/placeType props), ResultsList.tsx (passthrough), LocalSupportPage.tsx (useFaithPoints, handleVisit, placeType). Created VisitButton.test.tsx (7 tests), local-visit-storage.test.ts (20 tests). Updated Churches.test.tsx with useFaithPoints mock. |
| 5 | Cross-feature CTAs on listing cards | [COMPLETE] | 2026-03-24 | Created ListingCTAs.tsx (3 CTAs per category: churches/counselors/celebrate-recovery, Link+button pattern, responsive layout). Modified ListingCard.tsx (category prop, render CTAs after Get Directions), ResultsList.tsx (pass category to ListingCard). Created ListingCTAs.test.tsx (9 tests). |
| 6 | Insights Community Connections stat | [COMPLETE] | 2026-03-24 | Created CommunityConnections.tsx (visit stats, mood correlation, frosted glass card, returns null when no visits). Modified Insights.tsx (added CommunityConnections between ActivityCorrelations and GratitudeStreak, bumped animation indices). Created CommunityConnections.test.tsx (5 tests). |
| 7 | Integration tests & polish | [COMPLETE] | 2026-03-24 | Created LocalSupportEnhancements.test.tsx (8 integration tests covering logged-out search, CTAs for all 3 page types, URL params). Fixed regressions in CelebrateRecovery.test.tsx, Counselors.test.tsx (added useFaithPoints mock), useFaithPoints.test.ts (added localVisit to expected state), Insights.test.tsx (updated animation section count 7→8). Full suite: 394 files, 4252 tests, all green. |
