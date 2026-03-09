# Implementation Plan: Music Page Shell + Tabs + Worship Playlists + Navigation

**Spec:** `_specs/music-page-shell.md`
**Date:** 2026-03-09
**Branch:** `claude/feature/music-page-shell`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)

---

## Architecture Context

### Project Structure

- **Pages:** `frontend/src/pages/` — one file per route (e.g., `DailyHub.tsx`, `PrayerWall.tsx`)
- **Components:** `frontend/src/components/` — organized by feature (`audio/`, `daily/`, `prayer-wall/`, `local-support/`, `ui/`)
- **Data files:** `frontend/src/data/` — static data catalogs (`music/`, `scenes/`, `sound-catalog.ts`)
- **Types:** `frontend/src/types/` — TypeScript interfaces (`audio.ts`, `music.ts`)
- **Constants:** `frontend/src/constants/` — app-wide constants
- **Hooks:** `frontend/src/hooks/` — custom React hooks
- **Tests:** Co-located `__tests__/` directories next to the files they test

### Key Existing Patterns

**Tab system (DailyHub.tsx lines 16-287):**
- `useSearchParams()` for tab state with `replace: true`
- `TABS` const array with `id`, `label`, `icon`
- `isValidTab()` guard function
- Sticky tab bar with Intersection Observer sentinel
- Animated underline: `position: absolute; bottom: 0; width: ${100/TABS.length}%; transform: translateX(${index * 100}%)`
- All tab panels mounted at all times with `hidden={activeTab !== id}` for state preservation
- Arrow key + Home/End keyboard navigation via `handleTabKeyDown`
- ARIA: `role="tablist"`, `role="tab"` with `aria-selected`/`aria-controls`/`tabIndex`, `role="tabpanel"` with `aria-labelledby`

**Navbar (Navbar.tsx):**
- `MUSIC_LINKS` array (line 7-11): 3 sub-links with `NavDropdown` component
- `DesktopNav` (line 249-273): renders `NavDropdown` for Music with `extraActivePaths={['/music']}`
- `MobileDrawer` (lines 390-420): Music section with `MUSIC_LINKS.map()`, `pl-6` indent, `text-primary/50` heading

**PageHero (PageHero.tsx):**
- Background: `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)`
- Title: `font-script text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl`
- Subtitle: `mx-auto max-w-xl font-sans text-base text-white/85 sm:text-lg lg:text-xl`
- Padding: `px-4 pt-32 pb-16 sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24`

**App.tsx routes (lines 92-95):**
- Current stubs: `/music`, `/music/playlists`, `/music/ambient`, `/music/sleep` → `<ComingSoon>`
- `AudioProvider` wraps all routes (lines 74-108)

**Audio components already built:**
- `AmbientBrowser` — full ambient browse experience (scenes + sound grid + search + filters)
- `SleepBrowse` — full sleep browse (TonightScripture + scripture collections + bedtime stories)
- Audio state via `useAudioState()` hook from `AudioProvider`
- Dispatch via `useAudioDispatch()` — includes `PAUSE_ALL`, `PLAY_ALL`, `SET_MASTER_VOLUME`

**Test patterns (DailyHub.test.tsx):**
- `vi.mock('@/hooks/useAuth')` + `vi.mocked(useAuth)`
- Wrap in `MemoryRouter` + `ToastProvider` + `AuthModalProvider`
- `renderPage(initialEntry)` helper
- Test tab bar via `screen.getByRole('tablist')`, `screen.getAllByRole('tab')`
- Test URL-driven tab via `renderPage('/daily?tab=journal')`

### Database Tables

No database tables involved — this spec is entirely client-side.

### Auth Gating Pattern

- `useAuth()` returns `{ user, isLoggedIn }` — currently always `{ user: null, isLoggedIn: false }`
- `useAuthModal()` returns `{ openAuthModal(message?, mode?) }` from `AuthModalProvider`
- Auth gates for ambient sounds and sleep content are **already implemented** within `AmbientBrowser` (via `useSoundToggle`) and `SleepBrowse` (via `useForegroundPlayer`). No new auth gates needed in the Music page shell itself.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Play ambient sounds | Auth modal: "Sign in to play ambient sounds" | Already built in `useSoundToggle` hook | useAuth + useAuthModal (existing) |
| Play sleep content | Auth modal: "Sign in to play sleep content" | Already built in `useForegroundPlayer` hook | useAuth + useAuthModal (existing) |
| See personalization section | Hidden for logged-out users | Step 5 | `useAuth().isLoggedIn` conditional render |
| Play Spotify embeds | No gate — Spotify handles its own auth | N/A | N/A |

All auth-gated actions from the spec are pre-existing in the embedded components. The Music page shell adds only the personalization visibility gate (Step 5).

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Hero background | background-image | `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)` | PageHero.tsx line 8, design-system.md |
| Hero title | font | `font-script text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl` | PageHero.tsx line 31, design-system.md |
| Hero subtitle | font | `mx-auto max-w-xl font-sans text-base text-white/85 sm:text-lg lg:text-xl` | PageHero.tsx line 43 |
| Hero padding | padding | `px-4 pt-32 pb-16 sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24` | PageHero.tsx line 24 |
| Tab bar container | classes | `sticky top-0 z-40 bg-neutral-bg transition-shadow` + `shadow-md` when sticky | DailyHub.tsx lines 170-174 |
| Tab bar inner | classes | `mx-auto flex max-w-3xl items-center justify-center border-b border-gray-200` | DailyHub.tsx line 176 |
| Active tab | color | `text-primary` (#6D28D9) | DailyHub.tsx line 201, design-system.md |
| Inactive tab | color | `text-text-light` (#7F8C8D) | DailyHub.tsx line 202, design-system.md |
| Tab font | font | `text-sm font-medium` (mobile), `sm:text-base` (tablet+) | DailyHub.tsx line 199 |
| Animated underline | classes | `absolute bottom-0 h-0.5 bg-primary transition-transform duration-200 ease-in-out` | DailyHub.tsx line 221 |
| Section heading | font | Inter semi-bold: `text-base font-medium text-white` (dark bg) or `text-lg font-semibold text-text-dark` (light bg) | AmbientBrowser.tsx line 159 |
| Nav link active | underline | `after:scale-x-100` + `text-primary` (non-transparent) or `text-white` (transparent) | Navbar.tsx lines 24-41 |
| Mobile drawer link | classes | `min-h-[44px] flex items-center rounded-md px-3 text-sm font-medium` | Navbar.tsx line 377 |
| Follower count text | classes | `text-sm text-text-light` (muted) | design-system.md (Text Light #7F8C8D) |

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Branch `claude/feature/music-page-shell` is checked out
- [ ] All existing tests pass (`pnpm test`)
- [ ] `AmbientBrowser`, `SleepBrowse`, `SoundGrid`, `TonightScripture` components exist and function correctly
- [ ] `AudioProvider` wraps the entire app in `App.tsx`
- [ ] All auth-gated actions from the spec are accounted for in the plan
- [ ] Design system values are verified from the loaded design reference and codebase inspection

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Default tab | `ambient` (not `playlists`) | Spec says "Visiting `/music` with no query parameter defaults to the Ambient Sounds tab" — ambient is the primary interactive experience |
| Tab history | `replace: false` (push) for tab switches | Spec requires "Browser back button navigates between previously visited tabs" — this differs from DailyHub which uses `replace: true`. We use push instead. |
| Mobile tab labels | Shortened: "Playlists" / "Ambient" / "Sleep" | Spec: "use shorter labels if needed" at < 640px |
| Spotify postMessage detection | Build with postMessage listener + manual fallback toggle | Spotify iframe postMessage is not documented/reliable — we implement the listener but include the manual checkbox as fallback per spec |
| Personalization section | Build container structure, accept data via props/context | Spec says data source is future spec. Build the visual containers only, with empty array defaults. |
| Recently Added section | Build component, always hidden at launch | Spec: "hidden when all content is new" — hardcode `isHidden=true` for now with date-based logic ready |
| Embed error detection | Use iframe `onError` + timeout fallback | Standard iframe error detection; 10-second load timeout to show fallback card |
| Lofi cross-reference scroll target | Use `id` attribute on the Lofi embed container + `scrollIntoView` | Simple DOM scroll after tab switch |
| AmbientBrowser/SleepBrowse background | These components have their own dark `bg-hero-dark` backgrounds | The tab panels need no additional background — the components handle their own styling |

---

## Implementation Steps

### Step 1: Playlist Data File

**Objective:** Create the static data file containing all 8 Spotify playlist definitions.

**Files to create:**
- `frontend/src/data/music/playlists.ts` — playlist data with types

**Details:**

Define a `SpotifyPlaylist` interface:
```ts
export interface SpotifyPlaylist {
  id: string                   // e.g., 'top-christian-hits-2026'
  name: string                 // e.g., 'Top Christian Hits 2026'
  spotifyId: string            // e.g., '5Ux99VLE8cG7W656CjR2si'
  spotifyUrl: string           // full URL for fallback links
  section: 'worship' | 'explore'
  displaySize: 'hero' | 'prominent' | 'standard'
  followers?: number           // only for hero playlist
}
```

Export arrays: `WORSHIP_PLAYLISTS` (4 items), `EXPLORE_PLAYLISTS` (4 items), and `ALL_PLAYLISTS` (all 8). Exact playlist IDs from spec:
- `5Ux99VLE8cG7W656CjR2si` (hero), `6UCFGE9G29utaD959LeWcp` (prominent), `4chwiyywlgWUkGysVlkkVC` (standard), `47xeosl4bqNSsvartwZzMv` (standard)
- `7wyQnm63MRwAdRbBdK4mAH`, `6SUR3uQFcxhBuw37iDa06m`, `1P9YTdeqQjJnPY35KyyKji`, `6FvRhVisEFfmdpUBbS3ZFH`

Hero playlist gets `followers: 117155`.

**Guardrails (DO NOT):**
- DO NOT fetch follower counts from Spotify API — hardcode them
- DO NOT include any `dangerouslySetInnerHTML` anywhere
- DO NOT use external URLs except the Spotify embed URLs and direct Spotify links

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| exports correct number of playlists | unit | `ALL_PLAYLISTS.length === 8`, `WORSHIP_PLAYLISTS.length === 4`, `EXPLORE_PLAYLISTS.length === 4` |
| all playlists have required fields | unit | Every playlist has non-empty `id`, `name`, `spotifyId`, `spotifyUrl`, `section`, `displaySize` |
| hero playlist has followers | unit | The playlist with `displaySize: 'hero'` has `followers` defined |
| spotifyUrl contains spotifyId | unit | Each playlist's `spotifyUrl` includes its `spotifyId` |

**Expected state after completion:**
- [ ] `frontend/src/data/music/playlists.ts` exists with all 8 playlists
- [ ] Data tests pass
- [ ] No other files modified

---

### Step 2: SpotifyEmbed Component

**Objective:** Create a reusable Spotify embed component with lazy loading and error fallback.

**Files to create:**
- `frontend/src/components/music/SpotifyEmbed.tsx` — iframe wrapper with error handling

**Details:**

Props interface:
```ts
interface SpotifyEmbedProps {
  playlist: SpotifyPlaylist
  height?: number  // default 352
  className?: string
}
```

Renders an `<iframe>` with:
- `src="https://open.spotify.com/embed/playlist/${playlist.spotifyId}"`
- `width="100%"`, `height={height}`, `frameBorder="0"`
- `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"`
- `loading="lazy"`
- `title="${playlist.name} Spotify playlist"` (accessibility)
- `className="rounded-xl"` for consistent border radius

Error handling:
- Track load state via `useState<'loading' | 'loaded' | 'error'>('loading')`
- `onLoad` → set `'loaded'`, `onError` → set `'error'`
- 10-second timeout: if still `'loading'` after 10s, set `'error'`
- When `'error'`: render fallback card:
  - Dark card (`bg-[rgba(15,10,30,0.3)] rounded-xl border border-white/10 p-6 text-center`)
  - Playlist name in white font-medium
  - "Player couldn't load — tap to open in Spotify" in `text-white/60 text-sm`
  - "Open in Spotify" link (`<a href={playlist.spotifyUrl} target="_blank" rel="noopener noreferrer">`) styled as outline button: `border border-primary text-primary rounded-full px-5 py-2 text-sm font-medium`

**Responsive behavior:**
- All breakpoints: iframe fills container width (`w-full`)
- Height controlled by parent via `height` prop

**Guardrails (DO NOT):**
- DO NOT use `dangerouslySetInnerHTML`
- DO NOT embed any JavaScript from Spotify — iframe only
- DO NOT store any user data from Spotify

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders iframe with correct src | unit | iframe `src` contains the correct `spotifyId` |
| sets loading="lazy" | unit | iframe has `loading="lazy"` attribute |
| sets title for accessibility | unit | iframe `title` matches `"${name} Spotify playlist"` |
| shows fallback on error | unit | Simulate `onError` → fallback card with playlist name and "Open in Spotify" link |
| fallback link points to correct URL | unit | The "Open in Spotify" link `href` matches `playlist.spotifyUrl` |

**Expected state after completion:**
- [ ] `SpotifyEmbed` component renders an iframe or fallback
- [ ] Tests pass
- [ ] No other files modified

---

### Step 3: WorshipPlaylistsTab Component

**Objective:** Build the Worship Playlists tab content with Worship & Praise hero section and Explore grid.

**Files to create:**
- `frontend/src/components/music/WorshipPlaylistsTab.tsx` — tab content component

**Details:**

Imports `WORSHIP_PLAYLISTS`, `EXPLORE_PLAYLISTS` from data file. Imports `SpotifyEmbed`.

Layout (single scrollable column):

**"Worship & Praise" section:**
- Section heading: `<h2 className="mb-6 text-lg font-semibold text-text-dark">Worship & Praise</h2>`
- Hero embed (first playlist, `displaySize: 'hero'`):
  - Wrapper: `<div className="mx-auto w-full lg:w-[70%]">`
  - `<SpotifyEmbed playlist={hero} height={500} />`
  - Below: `<p className="mt-2 text-center text-sm text-text-light">117,000+ followers</p>`
- Second-prominent embed (`displaySize: 'prominent'`):
  - Wrapper: `<div className="mx-auto mt-6 w-full lg:w-[60%]">`
  - `<SpotifyEmbed playlist={prominent} />`  (default 352px)
- Standard embeds (2 remaining, `displaySize: 'standard'`):
  - `<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">`
  - Each: `<SpotifyEmbed playlist={...} />`

**"Explore" section:**
- Section heading: `<h2 className="mb-6 mt-10 text-lg font-semibold text-text-dark">Explore</h2>`
- Grid: `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">`
- Each of 4 explore playlists: `<SpotifyEmbed playlist={...} />`
- Lofi embed gets `id="lofi-embed"` on its wrapper div (scroll target for cross-reference)

Accept `onSpotifyPlay` callback prop for auto-pause integration (Step 6).

**Responsive behavior:**
- Mobile (< 640px): All embeds full-width, single column. Hero embed 500px height on all sizes.
- Tablet (640px+): Standard/Explore embeds in 2-column grid
- Desktop (1024px+): Hero embed 70% width centered, prominent 60% centered

**Guardrails (DO NOT):**
- DO NOT hardcode playlist IDs in the component — import from data file
- DO NOT add any user text input
- DO NOT use `dangerouslySetInnerHTML`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders "Worship & Praise" heading | unit | `screen.getByText('Worship & Praise')` |
| renders "Explore" heading | unit | `screen.getByText('Explore')` |
| renders 8 Spotify embeds | unit | `screen.getAllByTitle(/Spotify playlist/)` has length 8 |
| hero embed has 500px height | unit | First iframe has `height="500"` |
| shows follower count | unit | `screen.getByText(/117,000/)` |
| lofi embed has scroll target id | unit | `document.getElementById('lofi-embed')` exists |

**Expected state after completion:**
- [ ] `WorshipPlaylistsTab` renders both sections with all 8 embeds
- [ ] Tests pass
- [ ] No other files modified

---

### Step 4: MusicPage — Page Shell with Tabs

**Objective:** Create the Music page component with hero, sticky tab bar, and 3 tab panels.

**Files to create:**
- `frontend/src/pages/MusicPage.tsx` — main Music page

**Details:**

Follow the DailyHub.tsx pattern exactly (lines 16-287).

**Tab definitions:**
```ts
const TABS = [
  { id: 'playlists', label: 'Worship Playlists', shortLabel: 'Playlists' },
  { id: 'ambient', label: 'Ambient Sounds', shortLabel: 'Ambient' },
  { id: 'sleep', label: 'Sleep & Rest', shortLabel: 'Sleep' },
] as const
type MusicTabId = (typeof TABS)[number]['id']
```

Default tab: `'ambient'` (spec requirement).

**URL state:** Use `useSearchParams()` but with **push** (not replace):
```ts
const switchTab = useCallback((tab: MusicTabId) => {
  setSearchParams({ tab })  // no { replace: true } — enables back button nav
}, [setSearchParams])
```

**Page structure (top to bottom):**

1. **Navbar** — `<Navbar transparent />` (overlays hero)
2. **Hero** — Reuse `<PageHero>`:
   ```tsx
   <PageHero title="Music" subtitle="Worship, rest, and find peace in God's presence." />
   ```
3. **Personalization section** — placeholder for Step 5 (renders nothing initially)
4. **Recently Added section** — placeholder for Step 5 (renders nothing initially)
5. **Sentinel div** for sticky detection: `<div ref={sentinelRef} aria-hidden="true" />`
6. **Sticky tab bar** — exact same structure as DailyHub lines 170-230:
   - `sticky top-0 z-40 bg-neutral-bg` with conditional `shadow-md`
   - `role="tablist"` with `aria-label="Music sections"`
   - Mobile: show `shortLabel`, tablet+: show full `label`
   - Arrow key navigation (same `handleTabKeyDown` pattern)
   - Animated underline (`width: ${100/3}%`, `translateX(${index * 100}%)`)
   - No Lucide icons (unlike DailyHub's tabs — Music tabs are text-only)
7. **Tab panels** — all 3 mounted, `hidden` when inactive:
   - `tabpanel-playlists`: `<WorshipPlaylistsTab />`
   - `tabpanel-ambient`: `<div className="bg-hero-dark px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl"><AmbientBrowser /></div></div>` — matches existing `SleepBrowse` dark bg wrapper pattern
   - `tabpanel-sleep`: `<SleepBrowse />` (already has its own dark bg + max-w-6xl wrapper)
8. **SiteFooter** — `<SiteFooter />`

Wrap the entire page in `<div className="flex min-h-screen flex-col bg-neutral-bg font-sans">` with skip-to-content link.

**Responsive behavior:**
- Tab labels: Mobile uses `shortLabel` via `<span className="sm:hidden">{tab.shortLabel}</span><span className="hidden sm:inline">{tab.label}</span>`
- Tab bar sticky on all breakpoints
- Hero responsive via PageHero component (built-in)

**Guardrails (DO NOT):**
- DO NOT use `replace: true` in `setSearchParams` — must use push for back button support
- DO NOT duplicate the DailyHub completion tracking or Pray/Journal context passing
- DO NOT add auth gating at the page level — the page is public
- DO NOT add icons to the tab buttons (DailyHub has them; Music tabs are text-only per spec)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders hero with "Music" title | integration | `screen.getByText('Music')` in hero heading |
| renders subtitle | integration | `screen.getByText(/Worship, rest, and find peace/)` |
| renders 3 tabs | integration | `screen.getAllByRole('tab')` has length 3 |
| defaults to ambient tab | integration | Tab with "Ambient" text has `aria-selected="true"` |
| switches to playlists tab on click | integration | Click playlists tab → `aria-selected="true"` on that tab |
| shows correct content per tab | integration | Ambient shows `AmbientBrowser`, Sleep shows `SleepBrowse` |
| tab bar has tablist role | integration | `screen.getByRole('tablist')` exists |
| tabs have proper ARIA | integration | Each tab has `role="tab"`, `aria-selected`, `aria-controls` |
| keyboard navigation (ArrowRight) | integration | Focus on first tab, ArrowRight moves to second tab |
| renders PageHero with correct subtitle | integration | Subtitle text present |
| initial URL has no tab param (defaults to ambient) | integration | Render at `/music` → ambient tab active |
| URL param selects correct tab | integration | Render at `/music?tab=sleep` → sleep tab active |
| mobile shows short labels | integration | At mobile breakpoint, shortened tab labels visible |

**Expected state after completion:**
- [ ] `MusicPage.tsx` renders hero + sticky tabs + 3 tab panels
- [ ] Tab switching works via click and keyboard
- [ ] URL state synced with tabs
- [ ] Tests pass
- [ ] No other files modified yet (routes updated in Step 7)

---

### Step 5: Personalization & Recently Added Sections

**Objective:** Build the container components for the personalization section and recently added section (infrastructure only — data plugged in later).

**Files to create:**
- `frontend/src/components/music/PersonalizationSection.tsx` — personalization container
- `frontend/src/components/music/RecentlyAddedSection.tsx` — recently added container

**Details:**

**PersonalizationSection:**
- Accepts props: `continueListening?: { title: string; type: string; onPlay: () => void }`, `favorites?: Array<{ id: string; title: string }>`, `savedMixes?: Array<{ id: string; title: string }>`
- If no data in any category AND `!isLoggedIn`: return `null` (not rendered)
- If `isLoggedIn` but all arrays empty/undefined: return `null`
- Uses `useAuth()` for login check
- Wrapper: `<section aria-label="Personalized recommendations" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">`
- "Continue Listening" row: single landscape card (placeholder card with title + play button)
- "Your Favorites" row: horizontal scroll container (`overflow-x-auto flex gap-3 scrollbar-none`)
- "Your Saved Mixes" row: same horizontal scroll
- Each row hidden individually when its data is empty

**RecentlyAddedSection:**
- Accepts `items?: Array<{ id: string; title: string; addedAt: Date }>`
- Logic: filter items to those within 30 days. If all items are within 30 days AND there are no items older than 30 days (meaning everything is new), hide the section (spec: "hidden when all content is new").
- For launch: call with empty array or undefined — section returns `null`
- Wrapper: `<section aria-label="Recently added content" className="mx-auto max-w-6xl px-4 py-4 sm:px-6">`
- "New" badge: `<span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">New</span>` on items added within 14 days

Both sections integrated into `MusicPage.tsx` between hero and tab bar sentinel.

**Guardrails (DO NOT):**
- DO NOT fetch any data — these are pure presentational containers
- DO NOT persist any state — personalization data comes from AudioProvider context (future)
- DO NOT render empty states — just return null when data is absent

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| PersonalizationSection returns null when logged out | unit | Mock `isLoggedIn: false` → container not in DOM |
| PersonalizationSection returns null when no data | unit | Mock `isLoggedIn: true` + no data → null |
| PersonalizationSection renders continue listening when data exists | unit | Pass mock data → card rendered |
| PersonalizationSection has correct aria-label | unit | `aria-label="Personalized recommendations"` |
| RecentlyAddedSection returns null when empty | unit | No items → null |
| RecentlyAddedSection returns null when all content is new | unit | All items < 30 days old → null |
| RecentlyAddedSection shows "New" badge for < 14 day items | unit | Item 5 days old has "New" badge |
| RecentlyAddedSection has correct aria-label | unit | `aria-label="Recently added content"` |

**Expected state after completion:**
- [ ] Both components exist and render correctly (or return null)
- [ ] MusicPage integrates them between hero and tab bar
- [ ] Tests pass

---

### Step 6: Spotify Auto-Pause Integration

**Objective:** When a Spotify embed plays while ambient audio is active, fade and pause ambient audio.

**Files to create:**
- `frontend/src/hooks/useSpotifyAutoPause.ts` — hook for detecting Spotify playback and auto-pausing ambient

**Files to modify:**
- `frontend/src/components/music/WorshipPlaylistsTab.tsx` — add manual toggle and hook integration

**Details:**

**useSpotifyAutoPause hook:**
- Listens for `message` events on `window` from Spotify iframes
- Spotify embeds post messages when playback state changes (look for messages with `type: 'playback_update'` or similar from `https://open.spotify.com` origin)
- When Spotify play detected AND `audioState.activeSounds.length > 0`:
  1. Fade master volume to 0 over 2 seconds using `requestAnimationFrame` loop with `SET_MASTER_VOLUME` dispatches
  2. After fade: dispatch `PAUSE_ALL`
  3. Show toast: "Ambient paused. Tap pill to resume after playlist."
  4. Store original volume in ref to restore later
- Returns `{ manualPauseEnabled, setManualPauseEnabled, spotifyDetected }`:
  - `spotifyDetected`: whether postMessage detection is working
  - If NOT detected after first Spotify embed loads: show manual toggle checkbox

**Manual fallback toggle (in WorshipPlaylistsTab):**
- If `!spotifyDetected`: render checkbox above embeds:
  - `<label className="flex items-center gap-2 text-sm text-text-light"><input type="checkbox" checked={manualPauseEnabled} onChange={...} /> Pause ambient while playing playlists</label>`
  - When checked + user clicks a Spotify embed area: pause ambient (use click event on the embed wrapper div as a proxy signal)

**Guardrails (DO NOT):**
- DO NOT try to access the Spotify iframe's internal DOM (cross-origin blocked)
- DO NOT auto-resume — spec says user manually taps pill to resume
- DO NOT dispatch PAUSE_ALL if no sounds are active

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| shows manual toggle when spotify detection fails | unit | Set `spotifyDetected: false` → checkbox visible |
| toggle defaults to checked | unit | Checkbox `checked` by default |
| does not show toggle when detection works | unit | Set `spotifyDetected: true` → no checkbox |

**Expected state after completion:**
- [ ] Spotify auto-pause hook exists
- [ ] Manual fallback toggle appears when detection fails
- [ ] Tests pass

---

### Step 7: Route Updates and Navigation Changes

**Objective:** Update App.tsx routes and Navbar to replace stubs/dropdown with the Music page and direct link.

**Files to modify:**
- `frontend/src/App.tsx` — replace ComingSoon stubs with MusicPage + redirects
- `frontend/src/components/Navbar.tsx` — replace Music dropdown with direct link

**Details:**

**App.tsx changes:**
1. Import `MusicPage` from `'./pages/MusicPage'`
2. Replace the 4 music routes (lines 92-95) with:
```tsx
<Route path="/music" element={<MusicPage />} />
<Route path="/music/playlists" element={<Navigate to="/music?tab=playlists" replace />} />
<Route path="/music/ambient" element={<Navigate to="/music?tab=ambient" replace />} />
<Route path="/music/sleep" element={<Navigate to="/music?tab=sleep" replace />} />
```

**Navbar.tsx changes:**

1. Remove `MUSIC_LINKS` array (lines 7-11)
2. In `DesktopNav` (lines 249-273): replace the `<NavDropdown>` for Music with a direct `<NavLink>`:
```tsx
<NavLink to="/music" className={getNavLinkClass(transparent)}>
  Music
</NavLink>
```
3. In `MobileDrawer` (lines 390-420): replace the Music section group with a single link:
```tsx
<NavLink
  to="/music"
  onClick={onClose}
  className={({ isActive }) =>
    cn(
      'min-h-[44px] flex items-center rounded-md px-3 text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      'mt-2 border-t border-gray-100 pt-2',
      isActive ? 'text-[#2B0E4A]' : 'text-[#2B0E4A] hover:bg-[#F5F3FF]'
    )
  }
>
  Music
</NavLink>
```
   Remove the entire Music `<div role="group">` block and `music-heading` span.

**Responsive behavior:**
- Desktop: "Music" is a plain nav link with the same hover underline effect as "Daily Hub" and "Prayer Wall"
- Mobile: "Music" appears as a single link in the drawer (same level as "Daily Hub" and "Prayer Wall"), no section heading

**Guardrails (DO NOT):**
- DO NOT remove the `NavDropdown` component itself — it's still used by Local Support
- DO NOT change Local Support routes or dropdown
- DO NOT remove the `MUSIC_LINKS` import in test files that may reference it — check first

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| /music renders MusicPage | integration | Navigate to `/music` → Music hero visible |
| /music/playlists redirects to /music?tab=playlists | integration | Navigate to `/music/playlists` → redirected, playlists tab active |
| /music/ambient redirects to /music?tab=ambient | integration | Navigate to `/music/ambient` → redirected, ambient tab active |
| /music/sleep redirects to /music?tab=sleep | integration | Navigate to `/music/sleep` → redirected, sleep tab active |
| navbar shows "Music" as direct link | unit | Desktop nav has "Music" link, no dropdown chevron |
| navbar "Music" links to /music | unit | Link `href` is `/music` |
| mobile drawer shows "Music" as single link | unit | No "MUSIC" section heading in drawer |
| navbar "Music" has active state on /music route | unit | When on `/music`, link has active styling |

**Expected state after completion:**
- [ ] `/music` renders the full Music page
- [ ] Sub-routes redirect correctly
- [ ] Navbar shows "Music" as direct link (desktop + mobile)
- [ ] All existing tests still pass (no regressions in Navbar tests)

---

### Step 8: Lofi Cross-Reference Card

**Objective:** Add a callout card on the Ambient Sounds tab that links to the Christian Lofi playlist.

**Files to create:**
- `frontend/src/components/music/LofiCrossReference.tsx` — callout card component

**Files to modify:**
- `frontend/src/pages/MusicPage.tsx` — add the card below AmbientBrowser in the ambient tab panel

**Details:**

The card appears below the `AmbientBrowser` inside the ambient tab panel:
```tsx
<div className="mx-auto mt-8 max-w-6xl px-4 pb-8 sm:px-6">
  <LofiCrossReference onNavigate={() => { switchTab('playlists'); /* then scroll */ }} />
</div>
```

**LofiCrossReference component:**
- Card: `rounded-xl border border-white/10 bg-[rgba(15,10,30,0.3)] p-4 sm:p-5`
- Layout: flex row with text + arrow
- Text: "Want music with your mix?" in `text-sm text-white/80`, "Try Christian Lofi" in `text-sm font-medium text-primary-lt` with arrow indicator `→`
- Clickable card (`role="button"`, `tabIndex={0}`, `cursor-pointer`)
- `onClick`: calls the `onNavigate` prop
- After tab switch, scroll to `#lofi-embed`: use `setTimeout(() => document.getElementById('lofi-embed')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)` — small delay to ensure tab panel is visible

**Guardrails (DO NOT):**
- DO NOT render this on a light background — it lives inside the dark ambient tab

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders callout text | unit | "Want music with your mix?" and "Try Christian Lofi" visible |
| calls onNavigate on click | unit | Click card → `onNavigate` called |
| has role="button" | unit | Card element has `role="button"` |

**Expected state after completion:**
- [ ] Lofi cross-reference card appears at the bottom of the Ambient tab
- [ ] Clicking it switches to Playlists tab and scrolls to Lofi embed
- [ ] Tests pass

---

### Step 9: First-Time Hints

**Objective:** Add two contextual tooltips for first-time visitors to the Music page.

**Files to create:**
- `frontend/src/hooks/useMusicHints.ts` — hint state management hook
- `frontend/src/components/music/MusicHint.tsx` — tooltip component

**Files to modify:**
- `frontend/src/pages/MusicPage.tsx` — integrate hints

**Details:**

**useMusicHints hook:**
- Two hint keys: `'music-hint-sound-grid'`, `'music-hint-pill'`
- For logged-in users: read/write `localStorage` keyed to `music-hints-${user?.id}`
- For logged-out users: read/write `sessionStorage` with key `music-hints-anonymous`
- Returns: `{ showSoundGridHint: boolean, showPillHint: boolean, dismissSoundGridHint: () => void, dismissPillHint: () => void }`
- Each hint shown at most once. Once dismissed, stored value prevents re-showing.

**MusicHint component:**
- Props: `{ text: string; visible: boolean; position: 'above' | 'below'; onDismiss: () => void }`
- Render: small tooltip with arrow, `role="tooltip"`, `animate-fade-in`
- Pulsing arrow: small `▼` or `▲` character with `animate-pulse` (CSS), respects `prefers-reduced-motion`
- Styling: `bg-primary/90 text-white text-xs rounded-lg px-3 py-2 shadow-lg`
- Positioned relative to parent (parent uses `relative` positioning)

**Integration in MusicPage:**
- Hint 1 (sound grid): Wraps the first section of the ambient tab — visible when `showSoundGridHint && activeTab === 'ambient'`. Dismissed via a callback passed through to `AmbientBrowser` or via an event listener.
  - Simpler approach: render the hint above the AmbientBrowser content. Dismiss when any sound toggle event fires (listen for `activeSounds` changing from length 0 to >0 via `useAudioState()`).
- Hint 2 (pill): Rendered near the pill location. Visible when `showPillHint && audioState.pillVisible`. Dismissed when pill is opened (drawer opens) — listen for `audioState.drawerOpen` changing to `true`.

**Guardrails (DO NOT):**
- DO NOT block any interactive content with the hints
- DO NOT persist hints for logged-out users in localStorage (use sessionStorage only)
- DO NOT show hints on repeat visits for logged-in users who already dismissed them

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| shows sound grid hint on first visit | unit | No stored dismissal → `showSoundGridHint: true` |
| hides sound grid hint after dismissal | unit | Call `dismissSoundGridHint()` → `showSoundGridHint: false` |
| persists dismissal in localStorage for logged-in users | unit | Mock logged-in → dismiss → localStorage has key |
| persists dismissal in sessionStorage for logged-out users | unit | Mock logged-out → dismiss → sessionStorage has key |
| MusicHint renders with role="tooltip" | unit | `role="tooltip"` attribute present |
| MusicHint not in DOM when visible=false | unit | `visible={false}` → not rendered |

**Expected state after completion:**
- [ ] Both hints appear on first visit
- [ ] Hints dismiss on the correct interactions
- [ ] Persistence works differently for logged-in vs logged-out
- [ ] Tests pass

---

### Step 10: Integration Tests and Final Verification

**Objective:** Write integration tests for the complete Music page and verify all acceptance criteria.

**Files to create:**
- `frontend/src/pages/__tests__/MusicPage.test.tsx` — comprehensive page tests

**Details:**

Follow the DailyHub.test.tsx pattern:
- Mock `useAuth`, `useAudioState` (from AudioProvider), audio hooks
- Wrap in `MemoryRouter` + `ToastProvider` + `AuthModalProvider`
- `renderPage(initialEntry)` helper

**Key test scenarios:**

Tab behavior:
- Default tab is `ambient` at `/music`
- URL param `?tab=playlists` → playlists tab active
- URL param `?tab=sleep` → sleep tab active
- Invalid `?tab=invalid` → defaults to `ambient`
- Click playlists tab → playlists content visible, others hidden
- Tab bar has `role="tablist"`, 3 tabs with `role="tab"`
- Arrow key navigation works
- Tab panels have `role="tabpanel"` with `aria-labelledby`

Playlists tab:
- All 8 Spotify iframes render (check by `title` attribute)
- Hero embed has height 500
- Follower count text visible
- "Worship & Praise" and "Explore" headings present

Personalization:
- Not rendered when logged out
- Not rendered when logged in but no data

Accessibility:
- Tab keyboard navigation
- Skip-to-content link
- ARIA roles on all interactive elements

Redirects (test in App.test.tsx or separate):
- `/music/playlists` → redirects to `/music?tab=playlists`
- `/music/ambient` → redirects to `/music?tab=ambient`
- `/music/sleep` → redirects to `/music?tab=sleep`

**Guardrails (DO NOT):**
- DO NOT test AmbientBrowser or SleepBrowse internals — those have their own tests
- DO NOT test actual audio playback — mock the audio hooks

**Expected state after completion:**
- [ ] All integration tests pass
- [ ] All existing tests still pass (no regressions)
- [ ] All acceptance criteria from the spec are covered by tests

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Playlist data file |
| 2 | 1 | SpotifyEmbed component (uses playlist data types) |
| 3 | 1, 2 | WorshipPlaylistsTab (uses embed + data) |
| 4 | 3 | MusicPage shell with tabs (embeds WorshipPlaylistsTab + existing components) |
| 5 | 4 | Personalization & Recently Added sections (integrated into MusicPage) |
| 6 | 4 | Spotify auto-pause hook (needs MusicPage context) |
| 7 | 4 | Route updates + navbar changes (needs MusicPage component) |
| 8 | 4 | Lofi cross-reference card (lives in MusicPage ambient tab) |
| 9 | 4 | First-time hints (rendered in MusicPage) |
| 10 | 1-9 | Integration tests covering all features |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Playlist data file | [COMPLETE] | 2026-03-09 | Created `frontend/src/data/music/playlists.ts` (8 playlists, 3 exports) + `__tests__/playlists.test.ts` (4 tests passing) |
| 2 | SpotifyEmbed component | [COMPLETE] | 2026-03-09 | Created `frontend/src/components/music/SpotifyEmbed.tsx` + `__tests__/SpotifyEmbed.test.tsx` (5 tests). Used fake timers for error state testing since jsdom doesn't support iframe error events. |
| 3 | WorshipPlaylistsTab component | [COMPLETE] | 2026-03-09 | Created `frontend/src/components/music/WorshipPlaylistsTab.tsx` + `__tests__/WorshipPlaylistsTab.test.tsx` (6 tests passing) |
| 4 | MusicPage shell with tabs | [COMPLETE] | 2026-03-09 | Created `frontend/src/pages/MusicPage.tsx` + `__tests__/MusicPage.test.tsx` (14 tests). Used `replace: true` per user override (not push as originally planned). Mocked child components in tests for isolation. |
| 5 | Personalization & Recently Added sections | [COMPLETE] | 2026-03-09 | Created `PersonalizationSection.tsx`, `RecentlyAddedSection.tsx` + tests (4+4=8 tests). Integrated into MusicPage between hero and tab bar. Both return null at launch (no data). |
| 6 | Spotify auto-pause integration | [COMPLETE] | 2026-03-09 | Created `frontend/src/hooks/useSpotifyAutoPause.ts`. Updated `WorshipPlaylistsTab.tsx` with manual toggle + click handlers. Updated tests (9 passing). Fixed AuthUser mock missing `lastName`. |
| 7 | Route updates + navbar changes | [COMPLETE] | 2026-03-09 | Updated `App.tsx` (MusicPage route + 3 redirects), `Navbar.tsx` (Music moved to NAV_LINKS as direct link, removed MUSIC_LINKS + dropdown + mobile section group), `Navbar.test.tsx` (replaced 12 dropdown tests with 3 direct link tests, updated mobile menu labels). 779 tests passing, 0 regressions. |
| 8 | Lofi cross-reference card | [COMPLETE] | 2026-03-09 | Created `LofiCrossReference.tsx` + tests (3 passing). Integrated into MusicPage ambient tab panel with tab switch + smooth scroll to #lofi-embed. |
| 9 | First-time hints | [COMPLETE] | 2026-03-09 | Created `useMusicHints.ts` (localStorage for logged-in, sessionStorage for logged-out) + `MusicHint.tsx` (tooltip with role="tooltip", pulsing arrow). Integrated into MusicPage: sound grid hint in ambient tab (auto-dismiss on first sound), pill hint fixed at bottom (auto-dismiss on drawer open). Tests: `useMusicHints.test.ts` (6), `MusicHint.test.tsx` (2), `MusicPage.test.tsx` mocks updated (14 passing). |
| 10 | Integration tests + verification | [COMPLETE] | 2026-03-09 | Added 2 integration tests to `MusicPage.test.tsx` (playlists URL param, personalization not rendered when logged out). Total: 16 page tests. Full suite: 792 tests passing, 0 failures, 0 regressions. Build compiles cleanly. |
