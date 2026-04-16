# Feature: Ambient Sound Mixer

## Overview

The ambient sound mixer is the core interactive experience of Worship Room's Music feature. It lets users browse a catalog of 24 ambient sounds organized by category, tap icons to toggle sounds on/off, and adjust individual volumes via sliders in the audio drawer's Mixer tab. Layering calming sounds — rain, piano, singing bowls, birdsong — creates a personalized worship atmosphere that supports prayer, meditation, journaling, and rest.

This feature builds directly on the audio infrastructure from Spec 1 (AudioProvider, floating pill, drawer shell). The Mixer tab placeholder content is replaced with real per-sound volume sliders, and a new icon grid component provides the browse/toggle interface for use on the Ambient Sounds page (built in Spec 6).

---

## User Stories

- As a **logged-in user**, I want to browse ambient sounds organized by category (Nature, Environments, Spiritual, Instruments) so I can find sounds that match my mood and activity.
- As a **logged-in user**, I want to tap a sound icon to instantly add it to my mix with a smooth fade-in so the transition feels peaceful, not jarring.
- As a **logged-in user**, I want to tap an active sound icon to remove it with a smooth fade-out so I can adjust my mix without disruption.
- As a **logged-in user**, I want to see which sounds are active via a purple glow effect so I can tell at a glance what's in my mix.
- As a **logged-in user**, I want to adjust individual sound volumes via sliders in the drawer so I can fine-tune the balance between sounds.
- As a **logged-in user**, I want to have up to 6 sounds playing simultaneously so I can create rich, layered atmospheres.
- As a **logged-in user**, I want to be told when my mix is full and need to remove one to add another so I understand the limit.
- As a **logged-out visitor**, I want to browse the sound catalog and see the full grid so I can explore what's available before signing up.
- As a **logged-out visitor**, I want to see an auth modal when I try to play a sound so I know I need an account to use the mixer.

---

## Requirements

### 1. Sound Catalog

24 ambient sounds organized into 4 categories. Each sound has: a unique identifier, display name, category, associated Lucide icon, audio filename, loop duration, and tags for mood/activity/intensity.

**Category: Nature (7 sounds)**

| Name | Icon | Loop Duration | Mood | Activity | Intensity |
|------|------|---------------|------|----------|-----------|
| Gentle Rain | CloudRain | 4 min | peaceful | relaxation | very calm |
| Heavy Rain | CloudDrizzle | 3.5 min | contemplative | sleep | moderate |
| Ocean Waves | Waves | 4 min | peaceful | sleep | very calm |
| Forest Birds | Bird | 3.5 min | uplifting | prayer | moderate |
| Gentle Wind | Wind | 3 min | peaceful | relaxation | very calm |
| Thunder (Distant) | CloudLightning | 4 min | contemplative | sleep | moderate |
| Flowing Stream | Droplets | 3.5 min | peaceful | prayer | very calm |

**Category: Environments (6 sounds)**

| Name | Icon | Loop Duration | Mood | Activity | Intensity |
|------|------|---------------|------|----------|-----------|
| Fireplace | Flame | 5 min | peaceful | relaxation | very calm |
| Night Crickets | Bug | 4.5 min | restful | sleep | very calm |
| Cafe Ambience | Coffee | 5 min | uplifting | study | moderate |
| Night Garden | Flower2 | 4.5 min | contemplative | prayer | very calm |
| Rainy Window | CloudRain | 4 min | peaceful | sleep | very calm |
| Campfire | Tent | 5 min | contemplative | relaxation | moderate |

**Category: Spiritual (5 sounds)**

| Name | Icon | Loop Duration | Mood | Activity | Intensity |
|------|------|---------------|------|----------|-----------|
| Church Bells (Distant) | Bell | 2.5 min | contemplative | prayer | moderate |
| Choir Hum | Music | 3 min | peaceful | prayer | very calm |
| Singing Bowl | Circle | 2 min | contemplative | relaxation | very calm |
| Wind Chimes | Sparkles | 2.5 min | peaceful | prayer | very calm |
| Cathedral Reverb | Church | 3 min | contemplative | prayer | immersive |

**Category: Instruments (6 sounds)**

| Name | Icon | Loop Duration | Mood | Activity | Intensity |
|------|------|---------------|------|----------|-----------|
| Soft Piano | Piano | 7 min | peaceful | study | very calm |
| Acoustic Guitar | Guitar | 6.5 min | uplifting | relaxation | moderate |
| Gentle Harp | Music2 | 7 min | peaceful | prayer | very calm |
| Ambient Pads | Waves | 8 min | contemplative | sleep | very calm |
| Cello (Slow) | Music3 | 7.5 min | contemplative | prayer | moderate |
| Flute (Meditative) | Wind | 6 min | peaceful | prayer | very calm |

**Tag structure per sound:**
- **Mood** (1-2 values): peaceful, uplifting, contemplative, restful
- **Activity** (1-2 values): prayer, sleep, study, relaxation
- **Intensity** (1 value): very calm, moderate, immersive

Tags enable filtering and scene preset creation in Spec 3.

### 2. Icon Grid — Sound Browser

A grid of icon cards for browsing and toggling sounds. This component will be embedded in the Ambient Sounds page (Spec 6) but is built as a standalone, reusable component in this spec.

**Layout:**
- Organized by category with section headers: "Nature", "Environments", "Spiritual", "Instruments"
- Grid of square cards within each category, each showing a Lucide icon and sound name
- Cards are approximately 80x80px on mobile, 90x90px on tablet/desktop

**Card states:**
- **Inactive:** Lucide icon in semi-transparent white (`rgba(255,255,255,0.5)`) on a dark card background (`rgba(15,10,30,0.3)`). Sound name in small text below the icon.
- **Active (playing):** Purple border glow (`box-shadow: 0 0 12px rgba(147, 51, 234, 0.4)`), subtle pulse animation (scale 1.0 to 1.02, 3-second cycle, ease-in-out, infinite). Icon brightens to full white.
- **Loading:** Thin circular spinner overlay centered on the icon while the audio file fetches.
- **Error:** Small orange dot indicator in the top-right corner of the card. Disappears on successful retry.

**Animation rules:**
- All CSS animations respect `prefers-reduced-motion: reduce` — the purple glow stays but the pulse animation is disabled.

### 3. Sound Toggle Behavior

**Adding a sound (tap an inactive icon):**
1. If mix already has 6 sounds, show a toast: "Your mix has 6 sounds — remove one to add another." No further action.
2. Card transitions to loading state (spinner).
3. Audio file is fetched from the configured audio base URL + filename.
4. On success: audio is decoded, cached in memory, and connected to the audio graph.
5. Sound fades in over 1 second (gain from 0 to default volume 0.6) using smooth ramping.
6. Card transitions to active state (purple glow + pulse).
7. Sound appears as a new row in the drawer's Mixer tab.
8. If this is the first sound added, the floating pill fades in.

**Removing a sound (tap an active icon):**
1. Sound fades out over 1 second (gain ramps to 0) using smooth ramping.
2. After fade completes: audio nodes are disconnected and the sound is removed from state.
3. Card transitions back to inactive state.
4. Sound row is removed from Mixer tab.
5. If this was the last active sound, the floating pill fades out.

**Audio caching:** Sounds are lazy-loaded (fetched only when the user first taps to play). Once loaded, the decoded audio data is cached in memory. Toggling a sound off and back on reuses the cached data — no re-fetch needed.

**Load failure handling:**
- Automatic retry: up to 3 attempts with exponential backoff (1s, 2s, 4s delays).
- If all retries fail: card shows the orange error dot, toast displays: "Couldn't load [sound name] — tap to retry."
- Tapping the error-state card triggers a fresh load attempt (resets retry counter).

### 4. Seamless Looping

Each sound must loop seamlessly and indefinitely with no audible gap, click, or silence at the loop boundary.

**Technique:** Double-buffer crossfade. A second instance of the same sound is scheduled to begin slightly before the first instance ends. During the 1.5-second overlap window, the ending instance fades out while the new instance fades in. When the old instance finishes, it is disconnected. This repeats indefinitely.

**Loop durations** are inherent to the source files (2-8 minutes depending on category). Longer files mean fewer crossfade events and lower CPU overhead.

### 5. Mixer Tab Content

The Mixer tab in the audio drawer (shell built in Spec 1) is populated with real content:

**Active sounds list:** A vertical list of currently playing sounds. Each row contains:
- The sound's Lucide icon (small, matching the grid)
- Sound name
- Horizontal volume slider (native range input, styled with purple fill track, white thumb, dark unfilled track)
- Volume tooltip that appears above the slider thumb during drag, showing the current percentage (e.g., "70%"), then fades out 1 second after the user releases

**Volume slider behavior:**
- Changes fire continuously during drag.
- Volume transitions use smooth 20ms ramping (same technique as master volume from Spec 1) — no audible clicking.
- Default volume for newly added sounds is 60%.

**"Add Sound" shortcut:** At the bottom of the active sounds list, a "+ Add Sound" button that navigates to or scrolls to the icon grid on the ambient sounds page. On desktop with the side panel open, the page content is visible alongside the panel, so this works seamlessly.

**Empty state:** When no sounds are active, the Mixer tab shows: "Tap a sound on the Ambient Sounds page to start your mix" with a subtle pointer/arrow icon.

### 6. Audio File Format

All ambient sound files are MP3 at 192kbps. This provides universal browser support and good quality for ambient/instrument content on headphones. A typical 4-minute loop is approximately 5.5MB.

---

## Auth Gating

| Element | Logged-Out Behavior | Logged-In Behavior |
|---------|--------------------|--------------------|
| Browse sound grid | Yes — full grid visible, categories visible, can scroll | Yes |
| Tap to add a sound | Auth modal: "Sign in to play ambient sounds" | Sound loads and plays |
| Tap to remove an active sound | N/A (can't add sounds when logged out) | Sound fades out and is removed |
| Adjust individual volume sliders | N/A (can't add sounds when logged out) | Slider controls per-sound volume |
| View Mixer tab in drawer | Yes — sees empty state message | Yes — sees active sounds list |
| 6-sound limit toast | N/A | Toast appears when limit reached |
| "+ Add Sound" button in mixer | Visible but auth-gated on click | Navigates to icon grid |

**Auth modal triggers on the first tap of any sound icon for logged-out users.** This is consistent with the play-gate pattern used across the Music feature — browse freely, sign in to play.

---

## Responsive Behavior

### Mobile (< 640px)
- Icon grid: 3 columns, ~80px cards
- Category headers: full-width, left-aligned, slightly smaller text
- Touch targets: each card is at least 44x44px
- Mixer tab in drawer: full-width sliders, stacked vertically

### Tablet (640px - 1024px)
- Icon grid: 4 columns, ~90px cards
- Category headers: same as mobile
- Drawer behavior: same bottom sheet as mobile but wider content area

### Desktop (> 1024px)
- Icon grid: 6 columns, ~90px cards
- Mixer tab lives in the side panel alongside the page content
- "+ Add Sound" button scrolls the main page to the icon grid (visible alongside the panel)

---

## UX & Design Notes

- **Tone:** Calm, exploratory, playful. The icon grid should feel like a palette of peaceful sounds — inviting experimentation.
- **Colors:** Use the design system palette. Active cards use primary violet glow (`#6D28D9` at 40% opacity for box-shadow). Card backgrounds use `rgba(15,10,30,0.3)` matching the audio drawer aesthetic. Slider fill track uses primary violet.
- **Typography:** Inter for all text. Sound names in small/xs size. Category headers in medium weight.
- **Icons:** All from Lucide React. Consistent 24px size in the grid. 16px in the mixer rows.
- **Animations:**
  - Fade-in/out for sounds: 1 second, smooth gain ramp
  - Active card pulse: 3s cycle, scale 1.0-1.02, respects `prefers-reduced-motion`
  - Loading spinner: thin circle, continuous rotation
  - Volume tooltip: appears on drag, fades out 1s after release
- **Toast messages:** Use the existing Toast component/provider for limit and error messages.

---

## AI Safety Considerations

- **Crisis detection needed?** No — this feature has no user text input.
- **User input involved?** No — users interact only by tapping icons and dragging sliders.
- **AI-generated content?** No — all content is a static catalog of sounds.

---

## Auth & Persistence

- **Logged-out (demo mode):** Can browse the full sound catalog. Cannot play sounds (auth modal). Zero persistence — no cookies, no anonymous tracking.
- **Logged-in:** Can play up to 6 sounds simultaneously. Sound state lives in React context (AudioProvider) — no database writes in this spec. Saved mixes and favorites are Spec 7.
- **Route type:** Public (the icon grid component will be embedded on a public page in Spec 6).

---

## Worship Room Safety

- No user text input — crisis detection not applicable
- No `dangerouslySetInnerHTML` usage
- No database writes
- No AI-generated content
- All audio content is curated ambient sounds — no user-generated audio

---

## Out of Scope

- **Scene presets and transitions** — curated multi-sound presets with names and artwork (Spec 3)
- **Search bar and tag filtering** — browsing by mood, activity, or intensity tags (Spec 3)
- **Sleep & Rest content** — bedtime stories, sleep timer integration, wind-down UI (Specs 4-5)
- **Ambient Sounds page** — the `/music/ambient` route and page layout that embeds the icon grid (Spec 6)
- **Spotify playlists** — worship playlist integration on `/music/playlists` (Spec 6)
- **Saving mixes and favorites** — persisting custom mixes to database, favoriting individual sounds (Spec 7)
- **Routines** — multi-step guided experiences combining sounds, scripture, and meditation (Spec 8)
- **Backend API** — no API endpoints in this spec; all state is client-side

---

## Acceptance Criteria

- [ ] Sound catalog data exists with all 24 sounds, each having: id, name, category, icon, filename, loop duration, and mood/activity/intensity tags
- [ ] Icon grid displays sounds organized by 4 category sections with headers: Nature, Environments, Spiritual, Instruments
- [ ] Grid is responsive: 3 columns on mobile (< 640px), 4 columns on tablet (640-1024px), 6 columns on desktop (> 1024px)
- [ ] Inactive sound cards show semi-transparent icon + name on dark background
- [ ] Active sound cards show purple border glow + subtle pulse animation
- [ ] Pulse animation is disabled when `prefers-reduced-motion: reduce` is set
- [ ] Tapping an inactive sound shows loading spinner, fetches audio, fades in over 1 second, then shows active state
- [ ] Tapping an active sound fades it out over 1 second, then returns to inactive state
- [ ] Default volume for newly added sounds is 60% (0.6)
- [ ] 6-sound hard limit is enforced — tapping a 7th sound shows toast: "Your mix has 6 sounds — remove one to add another."
- [ ] Limit toast uses `role="alert"` for screen reader announcement
- [ ] Audio is lazy-loaded on first tap; cached audio data is reused on subsequent toggles (no re-fetch)
- [ ] Load failure triggers 3 automatic retries with exponential backoff (1s, 2s, 4s)
- [ ] After all retries fail, card shows orange error dot and toast: "Couldn't load [name] — tap to retry"
- [ ] Tapping an error-state card triggers a fresh load attempt
- [ ] Sounds loop seamlessly with no audible gap or click at the loop boundary (crossfade looping)
- [ ] Mixer tab shows a vertical list of active sounds, each with icon, name, and volume slider
- [ ] Volume sliders are native `<input type="range">`, styled with purple fill track and white thumb
- [ ] Volume tooltip appears above slider thumb during drag showing percentage, fades out 1s after release
- [ ] Volume changes use smooth 20ms ramping (no audible clicking)
- [ ] "+ Add Sound" shortcut button appears at the bottom of the mixer list
- [ ] Empty mixer state shows instructional message: "Tap a sound on the Ambient Sounds page to start your mix"
- [ ] Sound icon cards have `role="button"` and toggle `aria-label` ("tap to add" / "playing, tap to remove")
- [ ] Sound icon cards have `aria-pressed` attribute reflecting active state
- [ ] Loading state uses `aria-busy="true"` on the card
- [ ] Volume sliders have `aria-label` with sound name and current percentage
- [ ] Logged-out user tapping any sound icon sees auth modal: "Sign in to play ambient sounds"
- [ ] First sound added causes the floating pill to fade in
- [ ] Last sound removed causes the floating pill to fade out
- [ ] Pill and drawer from Spec 1 correctly reflect the number and state of active sounds
