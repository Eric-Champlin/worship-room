# Feature: Music Page Shell + Tabs + Worship Playlists + Navigation

## Overview

The Music page is the single-page tabbed hub that unifies Worship Room's three audio experiences — ambient sound mixing, sleep & rest content, and curated worship playlists — into one destination at `/music`. It mirrors the Daily Hub's proven tabbed pattern (Pray | Journal | Meditate) so users already understand how to navigate between content types.

This page transforms `/music` from a stub into the Music section's home. Users land on the Ambient Sounds tab by default, switch between tabs via a sticky tab bar with URL-synced state, and browse Spotify worship playlists in a dedicated tab. Logged-in users with listening history see personalized sections (Continue Listening, Favorites, Saved Mixes) above the tabs, drawing them back to where they left off.

The navigation is also simplified: the Music dropdown in the navbar is replaced with a single "Music" link that goes directly to `/music`.

---

## User Stories

- As a **logged-out visitor**, I want to visit `/music` and browse all three tabs freely so I can explore the full music experience before creating an account.
- As a **logged-out visitor**, I want to see curated Spotify worship playlists with embedded players so I can listen to worship music directly on the page.
- As a **logged-in user**, I want to switch between Worship Playlists, Ambient Sounds, and Sleep & Rest tabs with the URL updating so I can share direct links to specific tabs.
- As a **logged-in user**, I want to see a "Continue Listening" section above the tabs so I can quickly resume my last ambient scene or sleep session.
- As a **logged-in user**, I want Spotify playback to auto-pause my ambient mix so the two audio sources don't clash.
- As a **first-time visitor**, I want contextual hints explaining how the ambient mixer works so I'm not confused by the icon grid and floating pill.

---

## Requirements

### 1. Page Shell and Route

The `/music` route loads a single-page experience with a hero, optional personalization sections, a sticky tab bar, and swappable tab content.

**URL structure:** `/music` with a `tab` query parameter controlling which tab is active. Valid values: `ambient` (default), `sleep`, `playlists`. Visiting `/music` with no query parameter defaults to the Ambient Sounds tab.

**Page structure (top to bottom):**

1. **Hero** — "Music" in Caveat script font with a purple gradient background matching all other Worship Room page heroes. Subtitle: "Worship, rest, and find peace in God's presence." Uses the same visual pattern as the Prayer Wall hero and Local Support heroes.

2. **Personalization section** (logged-in users with listening history only) — Three horizontal-scroll rows:
   - "Continue Listening" — the last played scene or sleep session, one landscape card with a play button
   - "Your Favorites" — horizontal scroll of favorited scenes, sessions, or mixes (data source built in a future spec; hidden if empty)
   - "Your Saved Mixes" — horizontal scroll of saved custom mixes (data source built in a future spec; hidden if empty)
   - If the user has no history, favorites, or saved mixes, this entire section is not rendered — no empty state, just skip straight to the tab bar
   - For logged-out users: section is not rendered at all

3. **"Recently Added" section** (infrastructure only — hidden at launch) — Shows content added within the last 30 days with "New" badges (small purple pill with white text) on items added within 14 days. Horizontal scroll of cards. Hidden when all content is new (which is the case at launch — showing "new" badges on everything is not useful). This section activates automatically once content ages past 30 days and newer content is added.

4. **Tab bar** — Three tabs: "Worship Playlists" | "Ambient Sounds" | "Sleep & Rest". Sticky positioning so the tabs remain visible when scrolling within tab content. The visual style (underline indicator, font weight, color treatment) and transition behavior (animated underline slide, keyboard navigation) must exactly match the existing Daily Hub tab bar.

5. **Tab content area** — Renders the active tab's content. Each tab is kept mounted (hidden via CSS when inactive) so scroll position and component state are preserved when switching tabs, matching the Daily Hub pattern. Tab transitions use the same animation approach as the Daily Hub.

**URL state behavior:**
- Clicking a tab updates the URL query parameter (e.g., `/music?tab=playlists`)
- Browser back button navigates between previously visited tabs (each tab switch is a history entry)
- Direct URL access loads the correct tab (e.g., visiting `/music?tab=sleep` opens the Sleep & Rest tab)
- Shared links work: sending someone `/music?tab=ambient` loads the Ambient Sounds tab directly

**Sub-route consolidation:** The existing stub routes (`/music/playlists`, `/music/ambient`, `/music/sleep`) redirect to the corresponding tab on `/music` (e.g., `/music/ambient` redirects to `/music?tab=ambient`). This preserves any bookmarks or links while consolidating everything into the tabbed page.

### 2. Worship Playlists Tab Content

Eight curated Spotify playlists organized into two sections: "Worship & Praise" (hero section) and "Explore."

**Worship & Praise section — 4 playlists:**

| Playlist | Spotify Playlist ID | Display |
|----------|-------------------|---------|
| Top Christian Hits 2026 | `5Ux99VLE8cG7W656CjR2si` | Hero — large embed (500px height on desktop, full width on mobile, ~70% centered on desktop). Social proof text below: "117,000+ followers" in muted style. |
| Top Christian Songs 2025 | `6UCFGE9G29utaD959LeWcp` | Second-prominent embed — standard height (352px), slightly narrower than hero |
| Top Worship Hits 2026 | `4chwiyywlgWUkGysVlkkVC` | Standard card in a 2-column grid |
| Top Christian Pop 2026 | `47xeosl4bqNSsvartwZzMv` | Standard card in a 2-column grid |

**Explore section — 4 playlists:**

| Playlist | Spotify Playlist ID | Display |
|----------|-------------------|---------|
| Top Christian Indie 2026 | `7wyQnm63MRwAdRbBdK4mAH` | Standard card in a 2-column grid |
| Top Christian Rap 2026 | `6SUR3uQFcxhBuw37iDa06m` | Standard card in a 2-column grid |
| Top Christian Afrobeats 2026 | `1P9YTdeqQjJnPY35KyyKji` | Standard card in a 2-column grid |
| Top Christian Lofi 2026 | `6FvRhVisEFfmdpUBbS3ZFH` | Standard card in a 2-column grid |

**Spotify embed implementation:**
- Standard Spotify iframe embed format with `loading="lazy"` for performance
- Hero embed: 500px height. All other embeds: 352px height (Spotify default).
- Playlist data lives in a dedicated TypeScript data file — playlist IDs, names, follower counts (hardcoded, not fetched from Spotify API), section assignment, and display size are all defined there

**Embed error handling:**
- If a Spotify embed fails to load (network error, Spotify down), display a fallback card showing: the playlist name, a brief message ("Player couldn't load — tap to open in Spotify"), and an "Open in Spotify" link using the full Spotify URL

**Spotify + Ambient auto-pause:**
When the user plays a Spotify embed while ambient audio is active:
- Ambient sounds fade to zero over 2 seconds and pause
- The floating pill updates to show paused state
- A toast appears: "Ambient paused. Tap pill to resume after playlist."
- Detection: listen for `message` events from the Spotify iframe (Spotify posts play/pause state via postMessage). If detection is unreliable, provide a manual fallback toggle: "Pause ambient while playing playlists" checkbox on the playlists tab, defaulted to checked.
- When Spotify playback stops: the user taps the floating pill to manually resume ambient playback

### 3. Lofi Cross-Reference

On the Ambient Sounds tab, below the main content area, a small callout card:
- Text: "Want music with your mix? Try Christian Lofi"
- Arrow indicator pointing toward the playlists tab
- Tapping the card switches to the Worship Playlists tab and scrolls to the Christian Lofi embed

### 4. Navigation Update

The Music dropdown in the navbar (desktop and mobile) is replaced with a single "Music" link:
- Desktop: "Music" appears as a direct link in the top nav (same position, no dropdown arrow, no sub-items)
- Mobile drawer: "Music" appears as a single link (no "MUSIC" section heading with indented sub-links)
- Clicking "Music" navigates to `/music` (which defaults to the Ambient Sounds tab)
- Active state (underline or highlight) shows when the user is on the `/music` route

### 5. First-Time Hints

Two contextual tooltips for first-time visitors to `/music`:

**Hint 1 — Sound grid:** On the Ambient Sounds tab, near the first sound icon: "Tap any sound to add it to your mix" with a subtle pulsing arrow. Dismissed when the user taps any sound icon.

**Hint 2 — Floating pill:** When the floating pill first appears (after adding a sound): "Your mix lives here — tap to expand" pointing to the pill. Dismissed when the user taps the pill.

**Hint persistence:**
- Logged-in users: hint dismissal state stored in `localStorage` keyed to user ID (persists across sessions)
- Logged-out users: hint dismissal state stored in `sessionStorage` (persists within the browser session only)
- Each hint is shown at most once, dismissed on the relevant interaction

---

## Auth Gating

| Element | Logged-Out Behavior | Logged-In Behavior |
|---------|--------------------|--------------------|
| Visit `/music` page | Yes — page loads normally | Yes |
| See all three tabs | Yes — all tabs visible | Yes |
| Switch between tabs | Yes — no restrictions | Yes |
| See personalization section | No — section not rendered | Yes (if listening history exists) |
| Play Spotify embeds | Yes — Spotify handles its own auth (30-second preview for non-Spotify users, full playback for Spotify users) | Yes |
| Play ambient sounds (via Ambient Sounds tab) | Auth modal: "Sign in to play ambient sounds" (from Spec 2) | Yes |
| Play sleep content (via Sleep & Rest tab) | Auth modal: "Sign in to play sleep content" (from Spec 4) | Yes |
| See first-time hints | Yes — hints shown for all first-time visitors | Yes |
| Tap "Continue Listening" play button | N/A — section not shown | Resumes playback |
| Tap Lofi cross-reference card | Yes — switches tab (no audio plays until they try to play the embed) | Yes — switches tab |

---

## Responsive Behavior

### Mobile (< 640px)
- Hero: full-width Caveat hero, same height proportion as other page heroes
- Personalization section: horizontal scroll cards, single row visible at a time
- Tab bar: full-width, shorter labels if needed ("Playlists" | "Ambient" | "Sleep"). Sticky below hero on scroll.
- Worship Playlists tab: all embeds stacked in a single column (hero embed full-width, standard embeds full-width)
- Explore section: single column, stacked embeds
- Lofi cross-reference: full-width card below ambient content
- First-time hints: positioned relative to target elements, tooltips may appear above or below depending on screen space

### Tablet (640px - 1024px)
- Tab bar: full labels fit comfortably ("Worship Playlists" | "Ambient Sounds" | "Sleep & Rest")
- Worship & Praise section: hero embed full-width, standard embeds in 2-column grid
- Explore section: 2-column grid
- Personalization section: more cards visible in horizontal scroll

### Desktop (> 1024px)
- Tab bar: centered with generous spacing
- Worship & Praise hero embed: ~70% width, centered
- Second-prominent embed: ~60% width, centered
- Standard embeds: 2-column grid
- Explore section: 2-column grid
- Personalization section: horizontal scroll with 3-4 cards visible at a time

---

## UX & Design Notes

- **Tone:** Inviting, exploratory, restful. The Music page should feel like entering a peaceful room with multiple doors — playlists for active worship, ambient sounds for atmosphere, sleep content for rest.
- **Colors:** Purple gradient hero matching other Worship Room pages. Tab bar uses the same styling as Daily Hub (primary violet underline, white text, muted inactive tabs). Spotify embeds have their own visual style inside the iframe.
- **Typography:** Caveat for the hero title. Inter for tab labels, section headings, and body text. Section headings ("Worship & Praise", "Explore") in semi-bold Inter.
- **Animations:** Tab underline slides horizontally between tabs (matching Daily Hub). Smooth scroll when Lofi cross-reference navigates to the embed. Hints use a subtle pulse animation on the arrow indicator (respects `prefers-reduced-motion`).
- **Toast messages:** Use the existing Toast component for Spotify auto-pause notifications.

---

## AI Safety Considerations

- **Crisis detection needed?** No — this feature has no user text input.
- **User input involved?** No — users interact only by switching tabs, clicking embeds, and adjusting settings.
- **AI-generated content?** No — all content is curated playlists and static data.
- **Content safety:** Spotify embeds are sandboxed iframes with no XSS risk. Follower counts are hardcoded, not fetched from external APIs.

---

## Auth & Persistence

- **Logged-out (demo mode):** Can browse all tabs, view all playlists, play Spotify embeds (Spotify manages its own auth). Cannot play ambient sounds or sleep content (auth modal). Zero persistence — no cookies, no anonymous tracking.
- **Logged-in:** Full access to all features. Tab preference is not persisted (always defaults to Ambient Sounds). Personalization section shows data from AudioProvider state (Continue Listening) and future saved data (Favorites, Saved Mixes).
- **Route type:** Public

---

## Worship Room Safety

- Spotify embeds are sandboxed iframes — no XSS risk
- No user text input — crisis detection not applicable
- No `dangerouslySetInnerHTML` usage
- Follower count is hardcoded in data file, not fetched from Spotify API (no external data injection)
- No database writes in this spec
- All playlist URLs point to real Spotify playlists (no user-generated content)

---

## Out of Scope

- **Personalization data providers** — "Continue Listening," "Your Favorites," and "Your Saved Mixes" data sources are built in a future spec. This spec builds the section container and card layout; data is plugged in later.
- **"Recently Added" section content** — Infrastructure is built (component exists, date logic works) but the section stays hidden at launch because all content is new.
- **Spotify Web Playback SDK** — We use simple iframe embeds, not the SDK.
- **Custom Spotify player UI** — Spotify provides the player inside its iframe; we don't build a custom one.
- **Routines section** — A future spec adds a "Routines" section to the Music page.
- **Saved mixes and favorites persistence** — Database writes for saving user preferences are a future spec.
- **Backend API** — No backend endpoints in this spec; all state is client-side.
- **Dark mode** — Phase 4 feature; not addressed here.

---

## Acceptance Criteria

### Page Shell & Route
- [ ] `/music` route exists and loads the tabbed Music page (replacing the ComingSoon stub)
- [ ] Hero displays "Music" in Caveat script font with purple gradient background and subtitle "Worship, rest, and find peace in God's presence."
- [ ] `/music/playlists` redirects to `/music?tab=playlists`
- [ ] `/music/ambient` redirects to `/music?tab=ambient`
- [ ] `/music/sleep` redirects to `/music?tab=sleep`

### Tab Bar
- [ ] Three tabs display: "Worship Playlists" | "Ambient Sounds" | "Sleep & Rest"
- [ ] Tab bar visual style matches Daily Hub tabs exactly (underline indicator, font weight, color)
- [ ] Tab underline animation slides horizontally between tabs (matching Daily Hub)
- [ ] Tab bar is sticky — stays visible when scrolling within tab content
- [ ] Default tab is Ambient Sounds when visiting `/music` with no query param
- [ ] URL updates to `?tab=playlists`, `?tab=ambient`, or `?tab=sleep` on tab switch
- [ ] Direct URL access loads the correct tab (e.g., `/music?tab=sleep` opens Sleep & Rest)
- [ ] Browser back button navigates between previously visited tabs
- [ ] Tab scroll position is preserved when switching away and back (tabs mounted but hidden)
- [ ] Tab bar has `role="tablist"`, each tab has `role="tab"` and `aria-selected`, panels have `role="tabpanel"` with `aria-labelledby`
- [ ] Keyboard navigation works: Arrow Left/Right to switch tabs, Home/End for first/last tab
- [ ] On mobile (< 640px), tab labels shorten to "Playlists" | "Ambient" | "Sleep"

### Personalization Section
- [ ] Personalization section renders above the tabs for logged-in users with listening history
- [ ] Personalization section is not rendered for logged-out users
- [ ] Personalization section is not rendered for logged-in users with no history/favorites/mixes
- [ ] "Continue Listening" shows a single landscape card with play button for the last played content
- [ ] "Your Favorites" and "Your Saved Mixes" rows render as horizontal scroll containers (hidden when empty)
- [ ] Section has `aria-label="Personalized recommendations"`

### Recently Added (Infrastructure)
- [ ] "Recently Added" section component exists with date-based filtering logic (30-day window, 14-day "New" badge)
- [ ] Section is hidden at launch (all content is new — not useful to badge everything)
- [ ] Section has `aria-label="Recently added content"`

### Worship Playlists Tab
- [ ] "Worship & Praise" section displays with a section heading
- [ ] Top Christian Hits 2026 renders as a hero embed (500px height on desktop, full-width on mobile, ~70% centered on desktop)
- [ ] "117,000+ followers" social proof text displays below the hero embed in muted style
- [ ] Top Christian Songs 2025 renders as a second-prominent embed (352px height)
- [ ] Top Worship Hits 2026 and Top Christian Pop 2026 render in a 2-column grid (single column on mobile)
- [ ] "Explore" section displays with a section heading
- [ ] 4 Explore playlists render in a 2-column grid (single column on mobile)
- [ ] All 8 Spotify embed iframes render with correct playlist IDs
- [ ] All Spotify embeds use `loading="lazy"` for performance
- [ ] Each Spotify iframe has a descriptive `title` attribute (e.g., "Top Christian Hits 2026 Spotify playlist")
- [ ] Playlist data comes from a dedicated data file (not hardcoded in the component)

### Spotify + Ambient Auto-Pause
- [ ] When Spotify plays while ambient audio is active, ambient fades to zero over 2 seconds and pauses
- [ ] Floating pill updates to show paused state
- [ ] Toast displays: "Ambient paused. Tap pill to resume after playlist."
- [ ] If Spotify postMessage detection is unreliable, a manual "Pause ambient while playing playlists" toggle appears on the playlists tab (defaulted to checked)
- [ ] User can resume ambient by tapping the floating pill after Spotify stops

### Embed Error Handling
- [ ] If a Spotify embed fails to load, a fallback card displays with: playlist name, "Player couldn't load — tap to open in Spotify" message, and "Open in Spotify" link

### Lofi Cross-Reference
- [ ] A callout card appears on the Ambient Sounds tab: "Want music with your mix? Try Christian Lofi"
- [ ] Tapping the card switches to the Worship Playlists tab and scrolls to the Christian Lofi embed

### Navigation
- [ ] Music dropdown is removed from the desktop navbar — replaced with a single "Music" link
- [ ] "Music" link navigates to `/music`
- [ ] Mobile drawer shows "Music" as a single link (no section heading with indented sub-links)
- [ ] "Music" nav link shows active state when on the `/music` route

### First-Time Hints
- [ ] Hint 1: "Tap any sound to add it to your mix" appears near the first sound icon on the Ambient Sounds tab for first-time visitors
- [ ] Hint 1 is dismissed when the user taps any sound icon
- [ ] Hint 2: "Your mix lives here — tap to expand" appears when the floating pill first shows
- [ ] Hint 2 is dismissed when the user taps the pill
- [ ] Hints use `role="tooltip"`
- [ ] Logged-in hint dismissal persists in `localStorage` (keyed to user ID)
- [ ] Logged-out hint dismissal persists in `sessionStorage`

### Tab Content Integration
- [ ] Ambient Sounds tab renders the scene browse + icon grid + search/filter components from Specs 2-3
- [ ] Sleep & Rest tab renders the scripture/story browse + Tonight's Scripture from Spec 4
- [ ] Worship Playlists tab renders all playlist content from this spec
