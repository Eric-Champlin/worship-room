# Feature: Ambient Scene Presets, Transitions, Search & Filtering

## Overview

Scene presets are the curated heart of Worship Room's ambient sound experience. While the mixer (Spec 2) gives users creative freedom to build custom mixes, scenes provide instant access to beautifully composed atmospheres — each one a doorway into a moment of worship, rest, or reflection. A single tap on "Garden of Gethsemane" fills the room with evening crickets, warm wind, night garden sounds, and a distant singing bowl, all balanced to evoke the quiet place where Jesus prayed.

This spec adds three interconnected capabilities: **scene presets** (8 themed multi-sound compositions), **crossfade transitions** (smooth switching between scenes with undo), and **search + filtering** (finding sounds and scenes by name, mood, activity, intensity, and scripture theme). Together they transform the ambient sounds area from a bare mixer into a rich, browsable, content-forward experience consistent with worship/meditation apps like Calm and Hallow.

Builds directly on the audio infrastructure (Spec 1) and ambient sound mixer (Spec 2).

---

## User Stories

- As a **logged-in user**, I want to browse themed scene presets so I can load a balanced ambient atmosphere with one tap instead of building it sound by sound.
- As a **logged-in user**, I want to experience a smooth crossfade when switching scenes so the transition between atmospheres feels seamless and peaceful.
- As a **logged-in user**, I want to undo a scene switch within a few seconds so I can return to my previous mix if I preferred it.
- As a **logged-out visitor**, I want to browse scene presets with artwork and descriptions so I can see the richness of the ambient experience before creating an account.
- As a **logged-out visitor**, I want to search and filter sounds and scenes so I can explore content by mood, activity, or theme even before signing in.
- As a **logged-in user**, I want to search for sounds and scenes by name so I can quickly find what I'm looking for.
- As a **logged-in user**, I want to filter content by mood, activity, intensity, and scripture theme so I can discover scenes and sounds that match my current spiritual or emotional need.

---

## Requirements

### 1. Scene Preset Catalog

8 scene presets, each composing 3-4 individual sounds from the Spec 2 catalog at specific volumes. Every scene has:

- **Identity:** Unique identifier, display name, evocative description (1-2 sentences setting the scene)
- **Sound composition:** Array of sound references with preset volumes (not the default 60%)
- **Tags:** Mood (1-2), activity (1-2), intensity (1), and optional scripture theme (1-2)
- **Artwork:** Reference to an 800x800px image (placeholder for now — real artwork is Spec 10)
- **Animation category:** One of three CSS animation types for the drawer artwork (drift, pulse, or glow)

**The 8 Scenes:**

| # | Name | Type | Sounds (count) | Mood | Activity | Intensity | Scripture Theme | Animation |
|---|------|------|-----------------|------|----------|-----------|-----------------|-----------|
| 1 | Garden of Gethsemane | Scriptural | Night Crickets, Gentle Wind, Night Garden, Singing Bowl (4) | Contemplative | Prayer | Very Calm | Trust | Pulse |
| 2 | Still Waters | Scriptural (Psalm 23) | Flowing Stream, Gentle Wind, Forest Birds, Gentle Harp (4) | Peaceful | Prayer | Very Calm | Comfort | Drift |
| 3 | Midnight Rain | Poetic | Gentle Rain, Rainy Window, Thunder Distant (3) | Peaceful | Sleep | Very Calm | Rest | Drift |
| 4 | Ember & Stone | Poetic | Fireplace, Campfire, Soft Piano, Wind Chimes (4) | Contemplative | Relaxation | Very Calm | Comfort | Pulse |
| 5 | Morning Mist | Poetic | Forest Birds, Flowing Stream, Gentle Wind, Flute Meditative (4) | Uplifting | Prayer | Moderate | Praise | Drift |
| 6 | The Upper Room | Scriptural | Cathedral Reverb, Choir Hum, Ambient Pads, Church Bells (4) | Contemplative | Prayer | Immersive | Trust | Glow |
| 7 | Starfield | Poetic | Night Crickets, Gentle Wind, Ambient Pads, Cello Slow (4) | Contemplative | Sleep | Very Calm | Trust | Glow |
| 8 | Mountain Refuge | Scriptural | Gentle Wind, Flowing Stream, Church Bells, Acoustic Guitar (4) | Uplifting | Prayer | Moderate | Praise | Drift |

**Scene descriptions:**

1. **Garden of Gethsemane** — "Olive trees rustle in a warm evening breeze. Distant crickets and gentle wind carry you into the quiet place where Jesus prayed."
2. **Still Waters** — "Beside quiet waters, your soul finds rest. A gentle stream flows through green pastures under a soft sky."
3. **Midnight Rain** — "Rain patters against the window as the world sleeps. Wrapped in warmth, you listen to the rhythm of the night."
4. **Ember & Stone** — "A fire crackles in a quiet room. Warmth radiates through the stillness as you settle into God's presence."
5. **Morning Mist** — "Dawn breaks through a misty forest. Birds begin to sing as dew glistens on every leaf. A new mercy for a new day."
6. **The Upper Room** — "Silence fills a lamp-lit room. The disciples gather. In the hush between words, the Spirit moves."
7. **Starfield** — "Under an endless canopy of stars, you lie still. The universe whispers of its Creator, and you are held."
8. **Mountain Refuge** — "High above the valley, wind sweeps across ancient stone. Here, like Moses, you meet God on the mountain."

**Preset volume compositions** — each sound in a scene has a specific volume (not the default 60%), carefully balanced for that scene's mood. Volumes range from 0.10 to 0.65 depending on the sound's role in the mix (primary vs accent).

### 2. Scene Browse Layout

The ambient sounds area uses a hybrid layout with three vertical sections:

**Section A — Featured Scenes (top):**
- 2-3 large landscape-format cards (approximately 16:9 aspect ratio in view, cropped from the square artwork)
- Each card: scene artwork as background, scene name overlaid in white text, description below the name, play button
- Featured scenes are editorially selected (hardcode the first 2-3 scenes)
- Horizontal scroll on mobile (single card visible at a time), side-by-side on desktop

**Section B — All Scenes Grid:**
- All 8 scenes displayed as smaller square cards using the 800x800 artwork
- Each card: artwork background, scene name, 1-2 small tag chips (mood or activity), play button overlay on hover/tap
- Responsive grid: 2 columns on mobile, 3 on tablet, 4 on desktop

**Section C — Build Your Own Mix:**
- Section heading: "Build Your Own Mix"
- The icon grid from Spec 2 with all 24 individual sounds organized by category
- Placed below scenes so users see curated presets first, then the DIY option

### 3. Scene Transition Behavior

**Loading a scene when no audio is playing:**
1. User taps scene play button
2. Auth check — if logged-out, show auth modal (see Auth Gating section)
3. All scene sounds begin loading simultaneously
4. Each sound fades in over 1 second as it loads (staggered start times, not all simultaneous)
5. Floating pill appears, drawer shows scene artwork and mixer with the scene's preset volumes
6. Sounds load at their scene-defined volumes (not the default 60%)

**Switching scenes (audio already playing):**
1. User taps a different scene
2. Current mix crossfades out over 3 seconds
3. Simultaneously, new scene's sounds crossfade in over 3 seconds
4. Undo toast appears for 5 seconds: "Switched to [new scene name]. Undo?"
5. Tapping "Undo" crossfades back to the previous mix (previous state stored temporarily in memory)
6. If undo is not tapped within 5 seconds, previous state is discarded

**Foreground content exception:** If foreground content (scripture reading or bedtime story) is playing during a scene switch, the foreground audio stops cleanly — no crossfade of spoken content (that would be chaotic). Ambient sounds crossfade normally.

### 4. Scene Artwork

- 800x800px WebP images with JPEG fallback
- Stored locally for development (placeholder images for now)
- In production, served from CDN (Cloudflare R2)
- Each scene's data includes an artwork filename reference
- Real artwork sourcing is Spec 10 — this spec uses stock/placeholder images

**Artwork direction per scene** (for future sourcing):
1. Garden of Gethsemane — Dark olive grove at twilight, warm moonlight through branches
2. Still Waters — Serene stream through green meadow, soft golden hour light
3. Midnight Rain — Rain on window at night, warm interior glow, blurred lights
4. Ember & Stone — Glowing embers close-up, warm amber/orange tones, dark background
5. Morning Mist — Misty forest at sunrise, light rays through trees, dewy foliage
6. The Upper Room — Candlelit stone room, ancient architecture, soft shadows
7. Starfield — Night sky full of stars, silhouetted landscape, deep blue/purple
8. Mountain Refuge — Mountain peak at golden hour, vast valley below, wind-swept grass

### 5. Search Bar

**Location:** Top of the ambient sounds content area, above the featured scenes and filter chips.

**Visual design:**
- Text input with search icon (magnifying glass) on the left
- Placeholder text: "Search sounds and scenes..."
- Clear button (X icon) appears when text is entered; clears the search and restores normal browse view

**Behavior:**
- Client-side search — all data is local, no API calls
- Searches sound names, scene names, and scene descriptions
- Results replace the normal three-section browse layout with a flat list of matching sounds and scenes (mixed together)
- Search happens in real-time as the user types (debounced for performance)
- If no results: "No sounds or scenes match '[query]'" empty state message
- Page-scoped: only searches ambient content (sounds and scenes), not sleep/rest sessions

**Cross-tab search link:** Below results (or below "no results"), show a small text link: "Not finding it? Search all music" that switches to the Sleep & Rest tab with the search query preserved.

### 6. Tag Filter UI

**Location:** Below the search bar, above the featured scenes section.

**Default view — Quick-access chip bar:**
- Horizontal scrolling row of chips
- First chip: "Filter" with a funnel/slider icon — toggles the expanded filter panel
- Followed by 3-4 quick-access activity chips: "Prayer", "Sleep", "Relaxation", "Study"
- Active chips: filled purple background, white text
- Inactive chips: outlined style (border only, transparent fill)

**Expanded filter panel (when "Filter" chip is tapped):**
- Dropdown panel below the chip bar with 4 rows, one per tag dimension:
  - **Mood:** Peaceful, Uplifting, Contemplative, Restful
  - **Activity:** Prayer, Sleep, Study, Relaxation
  - **Intensity:** Very Calm, Moderate, Immersive
  - **Scripture Theme:** Trust, Comfort, Praise, Lament (applies only to scenes, not individual sounds)
- Each tag is a toggleable chip (same active/inactive styling as quick-access chips)
- Tapping "Filter" again collapses the panel

**Filter logic:**
- Multiple tags can be active simultaneously
- **Within a dimension:** OR logic — selecting "Peaceful" and "Uplifting" mood shows items matching either
- **Across dimensions:** AND logic — selecting "Peaceful" mood + "Sleep" activity shows only items matching both criteria
- Filters apply to both scenes and individual sounds in real-time (client-side)
- Active filter count shown as a badge on the "Filter" chip: e.g., "Filter (3)"
- Active quick-access chips in the chip bar stay highlighted to show at-a-glance what's filtered

### 7. CSS Ambient Animations in Drawer

When a scene is active and the audio drawer is open, the scene artwork in the drawer's now-playing area gets a subtle CSS animation based on the scene's animation category:

- **Drift:** Slow background-position movement — artwork appears to slowly pan across the frame. ~20-second cycle, ease-in-out, infinite alternate.
- **Pulse:** Slow opacity oscillation between ~85% and 100%. ~4-second cycle. Mimics warm firelight flickering.
- **Glow:** Slow transform scale between 1.0 and ~1.02. ~8-second cycle. Creates a living/breathing feel.

**Performance:** All animations use only compositable CSS properties (transform, opacity, background-position) — GPU-accelerated with no main thread impact.

**Accessibility:** All animations are disabled when `prefers-reduced-motion: reduce` is set. Artwork displays as a static image.

---

## Auth Gating

| Element | Logged-Out Behavior | Logged-In Behavior |
|---------|--------------------|--------------------|
| Browse scene presets (artwork, names, descriptions) | Yes — full catalog visible | Yes |
| Browse individual sounds grid | Yes — full grid visible | Yes |
| Use search bar | Yes — can type and see results | Yes |
| Use tag filters | Yes — can toggle filters and see filtered results | Yes |
| Tap to play a scene | Auth modal: "Sign in to play ambient scenes" | Scene loads and plays |
| Tap an individual sound | Auth modal: "Sign in to play ambient sounds" (same as Spec 2) | Sound loads and plays |
| Scene crossfade transitions | N/A (cannot play scenes) | 3-second crossfade between scenes |
| Undo scene switch toast | N/A | Toast appears for 5 seconds with undo option |

**Rationale:** Browse, search, and filter are fully open — this lets logged-out visitors explore the richness of the content library and discover scenes that resonate with them emotionally. Playing requires an account. This is consistent with the play-gate pattern established in Spec 2.

---

## Responsive Behavior

### Mobile (< 640px)
- **Featured scenes:** Horizontal scroll, single card visible at a time with peek of next card. Snap scroll for smooth card-to-card navigation.
- **Scene grid:** 2 columns, square cards
- **Search bar:** Full width, stacked above filter chips
- **Filter chip bar:** Horizontal scroll (chips overflow off-screen to the right)
- **Filter panel:** Full-width dropdown, same width as the content area
- **"Build Your Own Mix" grid:** 3 columns (matching Spec 2 mobile layout)
- **Undo toast:** Full-width at bottom of viewport, above the floating pill

### Tablet (640px - 1024px)
- **Featured scenes:** 2 cards visible side by side, horizontal scroll for 3rd
- **Scene grid:** 3 columns
- **Filter panel:** Same as mobile but wider chip spacing
- **"Build Your Own Mix" grid:** 4 columns (matching Spec 2 tablet layout)

### Desktop (> 1024px)
- **Featured scenes:** 2-3 cards visible side by side, no scroll needed
- **Scene grid:** 4 columns
- **Filter panel:** Same layout but with wider chips and more horizontal breathing room
- **"Build Your Own Mix" grid:** 6 columns (matching Spec 2 desktop layout)
- **Undo toast:** Fixed width, positioned bottom-right near the floating pill

---

## UX & Design Notes

- **Tone:** Rich, inviting, worship-forward. Scene names and descriptions should draw users in emotionally — these aren't just playlists, they're spiritual atmospheres. The browse experience should feel like opening a devotional, not scrolling a music app.
- **Colors:** Scene cards use the design system dark palette — card backgrounds at `rgba(15,10,30,0.3)` with purple border accents on hover. Tag chips use primary violet (`#6D28D9`) fill when active, outlined with white/purple border when inactive. All text on dark backgrounds is white or white at reduced opacity.
- **Typography:** Inter for all UI text. Scene names in semi-bold. Descriptions in regular weight, slightly reduced opacity for a softer feel. Tag chips in small/xs size.
- **Card interactions:** Scene cards show a play button overlay on hover (desktop) or tap (mobile). The play button is a circular icon centered on the card artwork.
- **Undo toast:** Dark glass aesthetic matching the floating pill. Appears at the bottom of the viewport, includes the new scene name and an "Undo" action button. Disappears after 5 seconds with a fade-out.
- **Filter panel:** Dark glass dropdown panel, matching the drawer aesthetic. Consistent with the dark purple palette used throughout the Music feature.
- **Search:** Minimal, clean input. Results show mixed sounds and scenes in a flat list — scenes appear as compact horizontal cards (artwork thumbnail + name + description), sounds appear as their icon cards from the grid.
- **Animations:** All CSS animations are gentle and barely perceptible — they create a "living" feel without being distracting. Disabled entirely under `prefers-reduced-motion`.

---

## AI Safety Considerations

- **Crisis detection needed?** No — the search bar accepts text input but only matches against a fixed local catalog. No text is sent to any AI or backend service. No user-generated content.
- **User input involved?** Yes — search bar accepts free text. However, it is purely a local filter against sound/scene names and descriptions. The text is never persisted, sent to a server, or processed by AI. No crisis detection is needed for client-side catalog search.
- **AI-generated content?** No — all scene names, descriptions, and tag data are static and curated.
- **No `dangerouslySetInnerHTML` usage** — scene descriptions render as plain text.
- **No database writes** — all state is client-side (React context and component state).

---

## Auth & Persistence

- **Logged-out (demo mode):** Can browse scenes, search, and filter. Cannot play. Zero persistence — no cookies, no anonymous tracking, no localStorage writes.
- **Logged-in:** Can play scenes, switch with crossfade, use undo. Scene state lives in AudioProvider context (React state). No database writes in this spec — saved scenes/favorites are Spec 7.
- **Route type:** Public — the ambient sounds content area (where scenes, search, and filters live) is part of a public page.

---

## Worship Room Safety

- No user-generated content that reaches the backend
- Search input is client-side only — never sent to any API
- No `dangerouslySetInnerHTML` usage
- No database writes
- All content is curated (scene names, descriptions, tags, artwork references)
- Scene descriptions use encouraging, peaceful language consistent with the app's mission

---

## Out of Scope

- **Sleep & Rest content** — bedtime stories, sleep timer, wind-down UI (Specs 4-5)
- **Music page shell and tabs** — the `/music/ambient` route and tab navigation (Spec 6)
- **Saving scenes as favorites** — bookmarking scenes, persisting favorites to database (Spec 7)
- **Scene artwork sourcing** — real images for scenes (Spec 10 — use placeholders)
- **Real ambient sound file sourcing** — actual audio files (Spec 10 — use placeholders)
- **Routines** — multi-step guided experiences that combine scenes with scripture or meditation (Spec 8)
- **Backend API** — no server endpoints; all state is client-side
- **Scene creation or customization by users** — users cannot create or modify scene presets
- **Sleep timer integration with scenes** — timer pauses scenes gracefully (Spec 5)

---

## Acceptance Criteria

### Scene Data & Catalog
- [ ] Scene data file defines all 8 scenes with typed interfaces
- [ ] Each scene has: id, name, description, artwork reference, sound composition with exact per-sound volumes, tags (mood, activity, intensity, scripture theme), and animation category
- [ ] Scene sound references map correctly to Spec 2's 24-sound catalog by sound ID
- [ ] Tag structure supports mood (array), activity (array), intensity (string), and optional scripture theme (array)

### Scene Browse Layout
- [ ] Featured scenes section shows 2-3 large landscape-format cards at the top of the browse area
- [ ] Featured cards display: artwork background, scene name overlaid in white, description, play button
- [ ] Full catalog grid shows all 8 scenes as square cards with artwork, name, and 1-2 tag chips
- [ ] Scene grid is responsive: 2 columns on mobile (< 640px), 3 on tablet (640-1024px), 4 on desktop (> 1024px)
- [ ] "Build Your Own Mix" section appears below the scene grid and contains the icon grid from Spec 2
- [ ] Featured scenes scroll horizontally on mobile with snap scroll, showing single card at a time

### Scene Playback & Transitions
- [ ] Tapping a scene triggers auth check — logged-out users see auth modal: "Sign in to play ambient scenes"
- [ ] Logged-in user tapping a scene loads all scene sounds simultaneously with staggered fade-in (1 second per sound)
- [ ] Scene sounds load at their preset volumes (not the default 60%)
- [ ] Floating pill appears and shows the scene name
- [ ] Drawer shows scene artwork and mixer with all scene sounds at preset volumes
- [ ] Switching scenes crossfades: old mix fades out over 3 seconds, new mix fades in over 3 seconds simultaneously
- [ ] Undo toast appears for 5 seconds after scene switch: "Switched to [scene name]. Undo?"
- [ ] Undo toast uses `role="alert"` for screen reader announcement
- [ ] Tapping "Undo" crossfades back to the previous mix within the 5-second window
- [ ] If undo is not tapped, previous state is discarded after 5 seconds
- [ ] If foreground content (scripture/story) is playing during a scene switch, it stops cleanly — no crossfade on spoken content

### Scene Artwork & Animations
- [ ] Scene artwork directory exists with 8 placeholder images (800x800px WebP)
- [ ] Drawer artwork receives CSS ambient animation matching the active scene's animation category
- [ ] Drift animation: slow background-position pan, ~20-second cycle
- [ ] Pulse animation: opacity oscillation 85%-100%, ~4-second cycle
- [ ] Glow animation: scale 1.0-1.02, ~8-second cycle
- [ ] All animations use compositable CSS properties only (transform, opacity, background-position)
- [ ] All animations are disabled when `prefers-reduced-motion: reduce` is set — artwork displays static

### Search
- [ ] Search bar appears at the top of the ambient content area with placeholder "Search sounds and scenes..."
- [ ] Search input has clear button (X) that appears when text is entered
- [ ] Search filters sounds and scenes by name and description in real-time (client-side, no API call)
- [ ] Results replace the normal browse layout with a flat list of matching sounds and scenes
- [ ] "No sounds or scenes match '[query]'" message shown when search matches nothing
- [ ] "Not finding it? Search all music" link appears below results (or below "no results")
- [ ] Clear button restores the normal browse view (featured scenes + grid + build your own mix)

### Tag Filtering
- [ ] Filter chip bar shows "Filter" toggle chip (with funnel icon) + 3-4 quick-access activity chips: "Prayer", "Sleep", "Relaxation", "Study"
- [ ] Tapping "Filter" chip expands a dropdown panel with 4 tag dimensions: Mood, Activity, Intensity, Scripture Theme
- [ ] Tapping "Filter" chip again collapses the panel
- [ ] Filter chips toggle on/off with clear visual state change (filled purple vs outlined)
- [ ] Active filter count is shown as a badge on the "Filter" chip: "Filter (3)"
- [ ] Within a dimension: OR logic (selecting "Peaceful" and "Uplifting" shows items matching either)
- [ ] Across dimensions: AND logic (selecting "Peaceful" mood + "Sleep" activity shows only items matching both)
- [ ] Filters apply in real-time to both scenes and individual sounds
- [ ] Scripture Theme tags filter scenes only (individual sounds do not have scripture themes)
- [ ] Logged-out users can use search and filters freely — no auth gate on browsing/filtering

### Accessibility
- [ ] Scene cards have `role="button"` and descriptive `aria-label` including scene name and description
- [ ] Search input has `aria-label="Search sounds and scenes"` and `role="searchbox"`
- [ ] Filter chips have `role="checkbox"` and `aria-checked` reflecting toggle state
- [ ] Filter chips have descriptive `aria-label` (e.g., "Filter by Peaceful mood")
- [ ] Filter panel has `role="region"` and `aria-label="Content filters"`
- [ ] Undo toast uses `role="alert"` for immediate screen reader announcement
- [ ] Scene transitions trigger `aria-live="polite"` announcement: "Now playing: [scene name]. [N] sounds active."
- [ ] All interactive elements have minimum 44x44px touch targets
