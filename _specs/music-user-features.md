# Feature: Music User Features — Persistence, Favorites, Saved Mixes, Sharing, Analytics

## Overview

The Music page becomes personal. Right now, every visit to `/music` starts fresh — no memory of what the user listened to, no way to save a favorite scene, no way to recall a custom mix they spent five minutes crafting. This spec adds the persistence layer that transforms the music experience from anonymous browsing into a personal sanctuary.

Favorites let users heart the scenes and sleep sessions they love. Saved mixes preserve custom ambient creations by name. Shareable links let users send a friend a custom mix that plays with one tap — no account required to listen. Session persistence means returning users see "Welcome back! Resume your last session?" instead of a blank slate. Listening analytics quietly tracks what users play so the app can surface time-of-day recommendations — worship playlists in the morning, focus-friendly ambient in the afternoon, sleep content at night.

All persistence is backed by localStorage as a temporary layer, designed behind a clean abstraction that swaps to API calls when the database is added in Phase 3.

---

## User Stories

- As a **logged-in user**, I want to favorite scenes and sleep sessions so I can find them quickly on my next visit.
- As a **logged-in user**, I want to save my custom ambient mix with a name so I don't have to rebuild it every time.
- As a **logged-in user**, I want to edit, delete, and duplicate my saved mixes so I can manage my collection over time.
- As a **logged-in user**, I want to share a custom mix via a link so anyone can open it and listen — even without an account.
- As a **logged-in user**, I want to see "Welcome back! Resume your last session?" when I return so I can pick up where I left off.
- As a **logged-in user**, I want personalized recommendations based on time of day so the app surfaces the right content at the right time.
- As a **logged-out visitor**, I want to open a shared mix link and play it immediately so I can experience the mix without creating an account.
- As a **logged-out visitor**, I want to see time-of-day recommendations (generic) so the Music page still feels curated and intentional.

---

## Requirements

### 1. StorageService — Abstraction Layer

A service class that provides a clean interface for all persistence operations. Currently backed by localStorage, designed so consuming code calls the same methods regardless of whether the backing store is localStorage or a future REST API.

**Capabilities:**
- Favorites: get all, add, remove, check if favorited
- Saved Mixes: get all, save new, update name, delete, duplicate
- Listening History: log a session, get recent sessions, get last session
- Session State: save current playback state, retrieve it, clear it
- Shared Mixes: decode a mix from a URL parameter, encode a mix into a shareable URL

**localStorage keys (all prefixed `wr_` to avoid collisions):**
- `wr_favorites` — JSON array of favorite objects
- `wr_saved_mixes` — JSON array of saved mix objects
- `wr_listening_history` — JSON array of listening session objects (capped at 100 entries)
- `wr_session_state` — JSON object of the last active session state

**Data shapes:**
- **Favorite**: type (`scene`, `sleep_session`, or `custom_mix`), target ID, timestamp
- **SavedMix**: generated UUID, user-given name, array of sounds with volumes, created/updated timestamps
- **ListeningSession**: generated UUID, content type (`ambient`, `scene`, `scripture`, `story`, `routine`), content ID, start time, duration in seconds, whether it completed
- **SessionState**: active sounds with volumes, foreground content ID, foreground playback position, master volume, saved-at timestamp

### 2. Favorites System

**Heart icon on every favoritable item:**
- Scene preset cards (from the ambient sounds browse layout)
- Sleep session cards (scripture readings, bedtime stories)
- Custom saved mix cards (from this spec)

**Behavior:**
- Tap heart to favorite or unfavorite (toggle)
- Optimistic UI: the heart fills immediately, localStorage write happens in the background
- If the localStorage write fails (storage full), the heart reverts and a toast appears: "Couldn't save favorite — storage may be full"

**Favorites display:**
- On the `/music` hub personalization section (built in the Music Page Shell spec): "Your Favorites" horizontal scroll row
- Mixed content types — scenes, sleep sessions, and mixes all in one scroll, sorted by most recently favorited
- Each card shows: artwork or icon, name, type badge (e.g., "Scene", "Sleep", "Mix"), filled heart, and play button
- Tapping play loads and starts the item (crossfading from current audio if something is already playing)

### 3. Saved Mixes — Save Flow

**Save button location:** In the audio drawer's Saved tab, and also as a "Save" icon in the drawer's now-playing section (next to the scene name or "Custom Mix" label).

**Save trigger conditions:**
- The current mix has been modified from a scene preset (sounds added, removed, or volume changed)
- OR the mix was built entirely from scratch (no scene preset loaded)
- The save icon does NOT appear when a scene preset is playing unmodified (users should favorite those instead)

**Save interaction:**
1. User taps the save icon
2. Auth check — if logged out, show auth modal
3. An inline input appears in the drawer (not a modal): text field pre-populated with a suggested name
   - If modified from a scene: "[Scene Name] Custom" (e.g., "Still Waters Custom")
   - If built from scratch: auto-generated from sound names (e.g., "Rain + Fireplace + Piano")
4. User can edit the name or accept the default
5. "Save" button confirms
6. Toast: "Mix saved!"
7. The mix appears in the Saved tab immediately

### 4. Saved Mixes — Management

**Saved mixes appear in 3 locations:**
1. Audio drawer's Saved tab: simple list with mix name, component sound icons, "Load" button
2. `/music` ambient tab: "Your Saved Mixes" section above scene presets (only for logged-in users who have saved mixes)
3. `/music` hub personalization section: alongside favorites and continue listening

**Actions on saved mixes (via three-dot menu on the card):**
- **Load:** Loads the mix — crossfades from current audio, or starts fresh. Same behavior as loading a scene preset.
- **Edit Name:** Inline text edit on the card.
- **Duplicate:** Creates a copy named "[Original Name] Copy". Opens the copy immediately for name editing.
- **Delete:** Confirmation dialog: "Delete [mix name]?" with "Delete" (red) and "Cancel" buttons. Permanent removal from localStorage.
- **Share:** Generates a shareable link (see below).

### 5. Shareable Mix Links

**URL format:** `/music?tab=ambient&mix={encodedMixData}`

**Mix data encoding:**
- The mix state is a JSON object: `{ sounds: [{ id: "rain-gentle", v: 0.7 }, { id: "fireplace", v: 0.4 }] }`
- Minified and Base64url-encoded into a URL-safe string
- Kept entirely in the URL query parameter — no server-side storage needed

**"Play This Mix" landing experience:**
When someone opens a shared mix URL:
1. The `/music` page loads with the Ambient Sounds tab active
2. Instead of the normal browse view, a "Shared Mix" hero appears at the top:
   - Scene artwork (generic branded artwork for custom mixes, or the matching scene artwork if it maps to a known scene)
   - Mix name (auto-generated from sound names, e.g., "Rain + Fireplace + Piano")
   - List of sounds with their volumes shown as small icons and volume bars
   - Large "Play This Mix" button (centered, prominent) — this is the user gesture that unlocks AudioContext
3. User taps "Play This Mix" — all sounds load and fade in at their specified volumes
4. After loading, the normal browse view appears below the hero
5. The hero can be dismissed with an X button

**No auth required to listen.** Anyone with the link can play the mix. The auth modal only appears if they try to save the mix to their favorites.

**Sharing action:**
- User taps "Share" on a saved mix (or from the drawer on any active custom mix)
- The shareable URL is generated and copied to clipboard
- Toast: "Mix link copied!"
- On mobile: also triggers the native share sheet (`navigator.share()`) if available, falling back to clipboard copy

### 6. Listening Analytics

**Logged automatically:**
- When any audio session starts: create a listening session entry
- When the session ends (user stops, timer fires, content finishes): update the duration and whether it completed
- Stored in localStorage, capped at 100 most recent entries — oldest pruned when a new entry is added

**Data used for:**
- "Continue Listening" on the `/music` hub personalization section: shows the last session
- Time-of-day recommendations (see below)
- Future engagement dashboard when the database exists

### 7. Session Persistence + Resume Prompt

**Session state is auto-saved on these triggers:**
- Sleep timer fires (audio paused): save session state
- User closes the browser tab (`beforeunload` event): save session state
- Periodic auto-save: every 60 seconds while any audio is active

**Session state captured:**
- Active sounds with their volumes
- Foreground content ID and approximate playback position
- Master volume level
- Timestamp of the save

**On return (next visit to `/music`):**
- Check for saved session state in localStorage
- If it exists and is less than 24 hours old:
  - Show a banner at the top of the page: "Welcome back! Resume your last session?"
  - "Resume" button loads the saved mix and starts ambient playback (foreground content starts from the beginning of the verse the user was on, not the exact second position — simpler and avoids partial-sentence starts)
  - "Dismiss" button clears the saved state and hides the banner
- If the saved state is older than 24 hours: auto-clear it, don't show the prompt

### 8. Time-of-Day Recommendations

**Determine the user's local time** using `new Date()` for the current hour.

**Four time brackets with content surfacing:**
- **Morning (6am-12pm):** Feature worship playlists and uplifting scenes (Morning Mist, Mountain Refuge). Heading: "Suggested for You"
- **Afternoon (12pm-6pm):** Feature focus-friendly ambient (Ember & Stone, Soft Piano). Heading: "Great for Focus"
- **Evening (6pm-10pm):** Feature calming scenes and surface sleep content. Heading: "Wind Down Tonight"
- **Night (10pm-6am):** Feature sleep & rest content prominently. Heading: "Ready for Rest". The default tab may switch to Sleep & Rest during this bracket (overriding the normal Ambient default).

**"Suggested for You" section** appears above the tabs on `/music` (below the personalization section, above any "Recently Added" section).

**Personalization:**
- If the user has listening history: weight recommendations toward content types they use most at this time of day
- If no history (or logged-out): use the generic time-bracket recommendations

---

## Auth Gating

| Element | Logged-Out Behavior | Logged-In Behavior |
|---------|--------------------|--------------------|
| See heart icons on scene/sleep/mix cards | Yes — outlined heart visible, but not interactive | Yes — interactive toggle |
| Tap heart to favorite | Auth modal: "Sign in to save favorites" | Toggles favorite state |
| See "Your Favorites" section on `/music` hub | No — section not rendered | Yes (if user has favorites) |
| See saved mixes section | No — section not rendered | Yes (if user has saved mixes) |
| Save a custom mix | Auth modal: "Sign in to save your mix" | Inline save flow in drawer |
| Edit, delete, or duplicate a saved mix | N/A — cannot save mixes when logged out | Full management via three-dot menu |
| Share a mix link | Yes — share button visible, generates link and copies to clipboard | Yes |
| Open a shared mix link and play it | Yes — no auth required to listen | Yes |
| Save a shared mix to favorites | Auth modal: "Sign in to save this mix" | Adds to favorites |
| See personalization section (Continue Listening, Favorites, Saved Mixes) | No — section not rendered | Yes (if data exists) |
| See time-of-day recommendations | Yes — generic recommendations based on time bracket | Yes — personalized if listening history exists |
| Resume prompt ("Welcome back!") | No — no session state saved for logged-out users | Yes — banner shown if session state exists and is < 24 hours old |
| Listening analytics logged | No — no tracking for logged-out users | Yes — sessions logged to localStorage |

---

## Responsive Behavior

### Mobile (< 640px)
- Favorites horizontal scroll: 2-3 cards visible at a time, swipeable
- Saved mixes in the drawer: full-width list items
- Saved mixes on the ambient tab: horizontal scroll cards
- "Your Saved Mixes" section: horizontal scroll (not grid)
- Share action: triggers native share sheet via `navigator.share()` if available, clipboard fallback
- Resume prompt: full-width banner at top of page, stacked buttons ("Resume" / "Dismiss")
- "Suggested for You" section: horizontal scroll cards, 2 visible at a time
- Shared mix hero: full-width, sounds listed vertically, play button full-width
- Three-dot menu on mix cards: bottom sheet style on mobile

### Tablet (640px - 1024px)
- Favorites horizontal scroll: 3-4 cards visible
- Saved mixes on ambient tab: 2-column grid
- "Suggested for You" section: horizontal scroll, 3 cards visible
- Shared mix hero: centered with padding, sound list in 2 columns
- Three-dot menu: standard dropdown

### Desktop (> 1024px)
- Favorites horizontal scroll: 4-5 cards visible
- Saved mixes on ambient tab: 3-column grid
- "Suggested for You" section: horizontal scroll, 4-5 cards visible, or a row of cards
- Share action: copy to clipboard only (no native share sheet on desktop)
- Shared mix hero: centered, max-width container, sound list in a horizontal row
- Three-dot menu: standard dropdown

---

## UX & Design Notes

- **Tone:** Personal, warm, welcoming. The favorites and saved mixes features should feel like building a personal library of peaceful moments, not a technical configuration tool.
- **Colors:** Heart icons use `danger` (#E74C3C) when filled (favorited), `white/50` outline when unfavorited. Save/share icons use white with subtle opacity. Shared mix hero uses the same purple gradient as other Worship Room heroes. Delete button in confirmation dialog uses `danger` red. Resume prompt banner uses a subtle `primary` violet background with white text.
- **Typography:** Mix names and favorites use Inter semi-bold. Time-of-day section headings use Inter bold. Sound names in the shared mix hero use Inter regular at a smaller size.
- **Animations:** Heart fill uses a brief scale-up bounce (100ms). Shared mix hero fades in on page load. Resume prompt banner slides down from the top. Toast notifications use the existing Toast component animation. Delete confirmation dialog fades in with backdrop.
- **Existing components to reference:** Use Toast for all notification messages. Use the existing auth modal pattern (AuthModal + useAuthModal) for all auth gates. Use the existing three-dot menu pattern if one exists, or a simple dropdown with consistent styling.

---

## AI Safety Considerations

- **Crisis detection needed?** No — the only user text input is mix naming, which is a short label (not emotional content). No crisis keyword scanning needed.
- **User input involved?** Yes — mix naming only. Input should be limited to a reasonable length (e.g., 50 characters max). No HTML rendering of the name — display as plain text only.
- **AI-generated content?** No — all content is user-created labels and system-generated recommendations. No AI output in this feature.
- **No `dangerouslySetInnerHTML`** — all user-provided mix names rendered as plain text via React's default escaping.

---

## Auth & Persistence

- **Logged-out (demo mode):** Can browse all content, play shared mix links, see generic time-of-day recommendations. Zero persistence — no favorites, no saved mixes, no listening history, no session state saved. Heart icons are visible but non-interactive (outlined only). Auth modal triggers on any persistence action.
- **Logged-in:** Full access to all features. Favorites, saved mixes, listening history, and session state all persist in localStorage. When the database exists (Phase 3+), the StorageService implementation swaps from localStorage to API calls with no changes to consuming components.
- **Route type:** Public (the `/music` page is public; persistence features are auth-gated at the interaction level, not the route level)

---

## Worship Room Safety

- No user text input beyond mix naming (short text, max 50 characters, no crisis detection needed)
- No `dangerouslySetInnerHTML` usage anywhere in this feature
- localStorage data is not sensitive — contains only sound IDs, volume levels, and user-given mix names (no PII beyond what's already in the auth context)
- Shared links encode only sound IDs and volume levels in the URL — no user data, no PII
- Mix names are rendered as plain text only — React's default escaping prevents any XSS from user-provided names
- No database writes in this spec — all persistence is client-side localStorage

---

## Out of Scope

- **Database-backed persistence** — Future Phase 3+ work. The StorageService abstraction is designed for this swap, but this spec only implements the localStorage backing.
- **Social features** — No sharing mixes to the Prayer Wall, no following other users' mixes, no collaborative playlists.
- **Listening streaks, achievements, or points** — Future engagement system (Feature #46-48 in CLAUDE.md).
- **OG meta tags for shared links** — Requires server-side rendering (Spring Boot serving frontend HTML). Links will work but won't have rich social media previews until SSR is set up. Skip for now.
- **Spotify listening analytics** — Spotify embeds are sandboxed iframes; we cannot detect play/pause reliably. Analytics only track ambient, scene, scripture, story, and routine content.
- **Custom artwork for shared mix links** — Shared mixes use a generic branded image, not per-mix generated artwork.
- **Dark mode** — Phase 4 feature; not addressed here.
- **Backend API endpoints** — No backend work in this spec.

---

## Acceptance Criteria

### StorageService
- [ ] A StorageService abstraction layer exists with a clean interface for favorites, saved mixes, listening history, session state, and shared mix encoding/decoding
- [ ] The localStorage implementation of StorageService works correctly for all methods
- [ ] All localStorage keys are prefixed with `wr_` to avoid collisions with other localStorage usage
- [ ] Listening history is capped at 100 entries — oldest entries are pruned when new ones are added

### Favorites
- [ ] Heart icon appears on scene preset cards, sleep session cards, and saved mix cards
- [ ] Logged-in user tapping heart toggles favorite state with optimistic UI (heart fills immediately)
- [ ] If localStorage write fails, heart reverts and toast shows: "Couldn't save favorite — storage may be full"
- [ ] Logged-out user tapping heart sees auth modal with message "Sign in to save favorites"
- [ ] Logged-out users see outlined (non-interactive) heart icons on cards
- [ ] Favorites are stored in localStorage and survive page refresh
- [ ] "Your Favorites" horizontal scroll section appears on the `/music` hub for logged-in users who have at least one favorite
- [ ] Favorite cards show artwork/icon, name, type badge, filled heart, and play button
- [ ] Favorites are sorted by most recently favorited
- [ ] Tapping play on a favorite card loads and starts the item (crossfading if audio is already playing)

### Saved Mixes — Save Flow
- [ ] Save icon appears in the drawer when the current mix is custom or modified from a scene preset
- [ ] Save icon does NOT appear when an unmodified scene preset is playing
- [ ] Logged-out user tapping save sees auth modal with message "Sign in to save your mix"
- [ ] Inline input appears in the drawer with a suggested name (scene-based or sound-name-based)
- [ ] User can edit the suggested name before confirming
- [ ] "Save" button confirms and shows toast: "Mix saved!"
- [ ] Saved mix appears in the drawer's Saved tab immediately after saving
- [ ] Mix name input is limited to 50 characters

### Saved Mixes — Management
- [ ] Saved mixes appear in the drawer's Saved tab, the ambient tab's "Your Saved Mixes" section, and the hub personalization section
- [ ] "Your Saved Mixes" section on the ambient tab only appears for logged-in users with saved mixes
- [ ] Loading a saved mix crossfades from current audio and loads the saved sounds at their saved volumes
- [ ] Edit Name: inline text edit on the card updates the mix name in localStorage
- [ ] Duplicate: creates a copy named "[Original Name] Copy" and opens it for name editing
- [ ] Delete: shows confirmation dialog "Delete [mix name]?" with red "Delete" and "Cancel" buttons
- [ ] Delete confirmation dialog has `role="alertdialog"` with focus trapped inside
- [ ] Deleting permanently removes the mix from localStorage

### Shareable Mix Links
- [ ] Share action generates a URL with Base64url-encoded mix data in the `mix` query parameter
- [ ] Share action copies the URL to clipboard and shows toast: "Mix link copied!"
- [ ] On mobile, share triggers `navigator.share()` if available, falling back to clipboard copy
- [ ] Opening a shared mix URL (`/music?tab=ambient&mix=...`) loads the "Play This Mix" hero
- [ ] Shared mix hero shows mix name (auto-generated from sound names), list of sounds with volume indicators, and a large "Play This Mix" button
- [ ] Shared mix hero has `aria-label="Shared ambient mix with {N} sounds"`
- [ ] Tapping "Play This Mix" starts all sounds at their specified volumes (user gesture unlocks AudioContext)
- [ ] No auth is required to play a shared mix link
- [ ] Logged-out user trying to save a shared mix to favorites sees auth modal: "Sign in to save this mix"
- [ ] The shared mix hero can be dismissed with an X button
- [ ] After dismissing the hero, the normal ambient browse view is visible

### Listening Analytics
- [ ] Listening sessions are logged automatically when audio starts and updated when audio ends
- [ ] Each session entry records content type, content ID, start time, duration, and completion status
- [ ] History is capped at 100 entries in localStorage — oldest are pruned on new entry
- [ ] "Continue Listening" on the `/music` hub shows the last session for logged-in users
- [ ] No listening data is logged for logged-out users

### Session Persistence + Resume Prompt
- [ ] Session state is auto-saved every 60 seconds while audio is active
- [ ] Session state is saved when the sleep timer fires
- [ ] Session state is saved on `beforeunload` (browser tab closing)
- [ ] Resume prompt banner appears at the top of `/music` when session state exists and is less than 24 hours old
- [ ] Resume prompt has `role="alert"` with focus auto-set to the "Resume" button
- [ ] "Resume" button loads the saved mix state and starts ambient playback
- [ ] "Dismiss" button clears the saved state and hides the banner
- [ ] Session state older than 24 hours is auto-cleared without showing the prompt
- [ ] Resume prompt is not shown for logged-out users

### Time-of-Day Recommendations
- [ ] Time-of-day recommendations use the browser's local time (via `new Date()`)
- [ ] Four time brackets are defined: morning (6am-12pm), afternoon (12pm-6pm), evening (6pm-10pm), night (10pm-6am)
- [ ] "Suggested for You" section appears above the tabs on `/music` with time-appropriate content
- [ ] Morning shows worship playlists and uplifting scenes with heading "Suggested for You"
- [ ] Afternoon shows focus-friendly ambient with heading "Great for Focus"
- [ ] Evening shows calming scenes with heading "Wind Down Tonight"
- [ ] Night shows sleep & rest content with heading "Ready for Rest"
- [ ] Logged-out users see generic time-bracket recommendations
- [ ] Logged-in users with listening history see personalized recommendations weighted toward their usage patterns
- [ ] Time-of-day section has `aria-label="Suggested for this time of day"`

### Accessibility
- [ ] Heart favorite buttons have `role="button"` and descriptive `aria-label` (e.g., "Add Garden of Gethsemane to favorites" / "Remove Garden of Gethsemane from favorites")
- [ ] Heart favorite buttons use `aria-pressed="true"` when favorited, `aria-pressed="false"` when not
- [ ] Save mix inline input has `aria-label="Name your mix"` and is auto-focused when opened
- [ ] All interactive elements (hearts, save buttons, share buttons, three-dot menus, resume/dismiss buttons) are keyboard accessible
