# Feature: Sleep & Rest — Foreground Audio Lane, Scripture Readings & Bedtime Stories

## Overview

Sleep & Rest is the "Hallow killer" — the feature that transforms Worship Room from a daytime devotional tool into a nighttime companion. Users browse curated scripture readings organized into themed collections and Bible bedtime stories with evocative descriptions, then start a session that plays as a foreground audio lane on top of the ambient mixer. A balance slider lets users find the perfect blend between the spoken voice and ambient sounds, creating a deeply personal sleep atmosphere. A scrubable progress bar gives full playback control, and a scripture text toggle lets users follow along with the WEB translation text while listening.

A daily-rotating "Tonight's Scripture" featured card draws users back each evening with a fresh reading. The browse experience is rich and content-forward — scripture collections scroll horizontally by theme, bedtime stories display in a responsive grid with descriptions and duration badges, and content type badges ("Scripture" / "Story") help users quickly distinguish between the two formats.

This feature builds directly on the audio infrastructure (Spec 1) and the ambient sound mixer (Spec 2). It introduces the concept of a foreground audio lane — a second, independent audio channel for long-form spoken content that layers on top of ambient sounds.

---

## User Stories

- As a **logged-out visitor**, I want to browse scripture reading collections and bedtime story listings so I can see the depth of sleep content before creating an account.
- As a **logged-in user**, I want to start a scripture reading that plays over my ambient mix so I can fall asleep to God's word in a calming atmosphere.
- As a **logged-in user**, I want to start a bedtime story that plays over my ambient mix so I can drift off to a reverent retelling of a Bible story.
- As a **logged-in user**, I want to adjust the balance between the spoken voice and ambient sounds so I can find the perfect blend for my sleep environment.
- As a **logged-in user**, I want to scrub through the reading or story using a progress bar so I can skip ahead or revisit a passage.
- As a **logged-in user**, I want to optionally see the scripture text while listening so I can follow along with the reading.
- As a **logged-out visitor**, I want to see a daily featured "Tonight's Scripture" so I'm drawn back each evening with fresh content.

---

## Requirements

### 1. Sleep Session Catalog Data

Two TypeScript data files containing the full sleep content catalog:

**Scripture Readings — 24 readings across 4 themed collections:**

Each reading has: unique identifier, title, scripture reference, collection association, full WEB translation text (for the text toggle), audio filename reference, duration in seconds, voice identifier, and tags.

**Collection: Psalms of Peace (6 readings)**

| Title | Reference | Voice | Duration |
|-------|-----------|-------|----------|
| The Lord is My Shepherd | Psalm 23 | Male | 5 min |
| God is Our Refuge | Psalm 46 | Female | 6 min |
| He Who Dwells in Shelter | Psalm 91 | Male | 8 min |
| I Lift My Eyes to the Hills | Psalm 121 | Female | 4 min |
| By the Rivers of Babylon | Psalm 137:1-6 | Male | 4 min |
| The Lord is My Light | Psalm 27:1-6 | Female | 5 min |

**Collection: Comfort & Rest (6 readings)**

| Title | Reference | Voice | Duration |
|-------|-----------|-------|----------|
| Come to Me, All Who Are Weary | Matthew 11:28-30 | Male | 3 min |
| Do Not Be Anxious | Philippians 4:6-8 | Female | 4 min |
| Those Who Wait on the Lord | Isaiah 40:28-31 | Male | 5 min |
| Peace I Leave With You | John 14:25-27 | Female | 3 min |
| Cast Your Burden on the Lord | Psalm 55:22 + 1 Peter 5:7 | Male | 4 min |
| He Gives Sleep to His Beloved | Psalm 127:1-2 | Female | 3 min |

**Collection: Trust in God (6 readings)**

| Title | Reference | Voice | Duration |
|-------|-----------|-------|----------|
| Trust in the Lord | Proverbs 3:5-6 | Female | 3 min |
| All Things Work Together | Romans 8:28-39 | Male | 8 min |
| I Know the Plans | Jeremiah 29:11-13 | Female | 4 min |
| Be Strong and Courageous | Joshua 1:9 | Male | 3 min |
| Fear Not, I Am With You | Isaiah 41:10-13 | Female | 4 min |
| The Lord is Near | Psalm 145:17-20 | Male | 3 min |

**Collection: God's Promises (6 readings)**

| Title | Reference | Voice | Duration |
|-------|-----------|-------|----------|
| A New Heaven and New Earth | Revelation 21:1-7 | Male | 6 min |
| No Eye Has Seen | 1 Corinthians 2:9-12 | Female | 4 min |
| He Will Wipe Every Tear | Revelation 7:15-17 | Male | 4 min |
| The Steadfast Love of the Lord | Lamentations 3:22-26 | Female | 4 min |
| My Grace is Sufficient | 2 Corinthians 12:9-10 | Male | 3 min |
| Nothing Can Separate Us | Romans 8:35-39 | Female | 5 min |

Voice assignments alternate male/female within each collection. All scripture text uses the WEB (World English Bible) translation — public domain, no licensing required.

**Bedtime Stories — 12 stories:**

Each story has: unique identifier, title, description, audio filename reference, duration in seconds, voice identifier, length category ("Short" / "Medium" / "Long"), and tags.

| # | Title | Length | Voice | Duration | Description |
|---|-------|--------|-------|----------|-------------|
| 1 | Noah and the Great Flood | Medium | Male | 18 min | "The world grows dark with wickedness, but one faithful man hears God's voice. As rain begins to fall, Noah's trust is rewarded with a promise written in the sky." |
| 2 | David and the Giant | Medium | Female | 16 min | "A shepherd boy steps onto a battlefield where warriors tremble. With nothing but a sling and unshakable faith, David faces the impossible." |
| 3 | Daniel in the Lions' Den | Short | Male | 10 min | "The den is sealed. Lions pace in the darkness. But Daniel kneels in peace, knowing his God has never failed him." |
| 4 | Joseph and the Coat of Many Colors | Long | Female | 28 min | "Betrayed by his brothers, sold into slavery, forgotten in prison — yet Joseph's story is one of patience, forgiveness, and God's hidden hand." |
| 5 | The Good Samaritan | Short | Male | 9 min | "On a dusty road, a wounded man lies forgotten. Those who should help pass by. Then a stranger — an unlikely hero — stops." |
| 6 | The Prodigal Son | Medium | Female | 17 min | "A son demands his inheritance and wanders far from home. But a father's love does not wander. It waits." |
| 7 | Jesus Calms the Storm | Short | Male | 8 min | "Waves crash over the bow. The disciples cry out in terror. And in the back of the boat, Jesus sleeps — until He speaks to the wind." |
| 8 | The Garden of Eden | Long | Female | 30 min | "In the beginning, everything is perfect. Walk through a garden where God Himself comes to visit in the cool of the evening." |
| 9 | A Journey Through Psalm 23's Green Pastures | Medium | Male | 20 min | "Follow the shepherd along quiet paths, beside still waters, through dark valleys, and into the house of the Lord. A journey through the most beloved psalm." |
| 10 | The Stars of Abraham | Short | Female | 12 min | "On a clear desert night, God leads an old man outside his tent. 'Look up,' He says. 'Count the stars, if you can.' A promise that changed everything." |
| 11 | Ruth and Naomi's Journey | Long | Male | 26 min | "Two women walk a long road together — one returning home in grief, the other choosing loyalty over comfort. A story of devotion that rewrites destiny." |
| 12 | Elijah and the Still Small Voice | Medium | Female | 15 min | "The prophet runs. He hides. He begs God to let him die. Then, in the silence after fire and earthquake, God speaks — not in thunder, but in a whisper." |

**Tone guidance for all stories:** Reverent and calm — like a pastor telling a story by firelight. Warm, unhurried, descriptive but not dramatic. Present tense for immediacy. Long flowing sentences. Designed to help listeners drift to sleep.

### 2. Sleep & Rest Browse UI

The browse UI is a component designed for the Sleep & Rest tab content area (the tab shell is built in Spec 6, but the browse content component is built here).

**"Tonight's Scripture" — Daily Featured Section:**
- Single highlighted card at the top of the browse area, slightly larger than regular cards with an accent border
- "Tonight's Scripture" label above the card
- Shows title, scripture reference, duration, and play button
- Rotates daily — deterministic, same for all users on the same day
- Uses day-of-year index into the scripture catalog (client-side, no backend)

**Scripture Collections — 4 sections:**
- Each collection has a heading (e.g., "Psalms of Peace") followed by a horizontal-scrolling row of session cards
- Each card shows: title, scripture reference, duration badge, voice indicator icon (male/female), "Scripture" content type badge, and play button
- Cards are text-focused with subtle gradient backgrounds — distinct from the artwork-heavy ambient scene cards
- No large artwork on scripture cards (scripture readings don't have scene artwork)

**Bedtime Stories — 1 section:**
- Section heading: "Bedtime Stories"
- Cards show: title, description (2 lines, truncated with ellipsis), duration badge, length category label ("Short" / "Medium" / "Long"), voice indicator icon, "Story" content type badge, and play button
- Cards arranged in a responsive grid (see Responsive Behavior section)

### 3. Foreground Audio Lane

A second audio channel independent from the ambient mixer, designed for long-form spoken content (scripture readings and bedtime stories).

**Playback architecture:**
- Uses an HTML `<audio>` element (not AudioBufferSource) for long-form content — better for large files, supports native seeking, and survives mobile background/screen lock
- Connected to the Web Audio API graph via MediaElementAudioSourceNode into a foreground GainNode into the Master GainNode
- The foreground GainNode volume is controlled by the foreground/background balance

**Starting a session:**
1. User taps play on a scripture reading or bedtime story card
2. Auth check — if logged-out, show auth modal with message "Sign in to listen to sleep content"
3. If foreground content is already playing, show a content switching confirmation dialog (see below)
4. Audio loads and begins playing
5. Drawer updates: now-playing section shows title, progress bar, voice indicator
6. If no ambient sounds are playing, foreground plays alone (balance slider hidden)

**Content switching confirmation dialog:**
- When the user taps play on new content while foreground audio is already playing
- Dialog message: "You're listening to [current title] ([remaining time] remaining). Start [new title] instead?"
- Two buttons: "Switch" and "Keep Listening"
- "Switch": current foreground crossfades out over 2 seconds, new content loads and starts
- "Keep Listening": dismisses the dialog, no change
- Dialog has focus trapping and `role="alertdialog"`

### 4. Foreground/Background Balance

A single horizontal slider that controls the mix between the foreground voice and ambient background sounds.

- **Only visible when BOTH foreground content and ambient sounds are active** — hidden if only one is playing
- Located in the drawer's now-playing section
- Left extreme (0): voice at full volume, ambient muted
- Right extreme (1): ambient at full volume, voice muted
- Center (0.5): both at equal levels
- Default position: 0.5 (center)
- Volume math: foreground GainNode = `1 - balanceValue`, each ambient GainNode = `originalVolume * balanceValue * 2` (clamped to max of originalVolume)
- Same visual styling as the existing volume sliders (purple fill on dark track)

### 5. Progress Bar

Horizontal progress bar in the drawer's now-playing section, visible only when foreground content is playing.

- Thin bar with purple fill on dark track (same styling as volume sliders)
- Scrubable: user can drag to seek forward/backward
- Elapsed time displayed on the left ("4:32"), remaining time on the right ("-8:15")
- Current content title displayed below the progress bar
- Voice indicator: small icon showing male/female voice next to the title
- Audio continues playing during scrub (no pause-on-scrub) — the `<audio>` element's `currentTime` is updated directly on drag

### 6. Scripture Text Toggle

A read-along feature for scripture readings, allowing users to see the text while listening.

- Small BookOpen icon (Lucide) in the drawer's now-playing section, next to the content title
- Tapping toggles a text panel that slides open below the progress bar
- Panel shows the full WEB translation text of the current scripture reading
- Current verse is softly highlighted as it's read (verse-level sync, not word-level)
- Hidden by default — most users will have eyes closed
- Toggle state remembered for the current session only (not persisted across sessions)
- **Only available for scripture readings, not bedtime stories** — the BookOpen toggle icon is hidden when a bedtime story is playing
- When visible, the panel is scrollable if text is longer than available space

### 7. "Tonight's Scripture" Daily Rotation

- Client-side only, no backend needed
- Deterministic rotation: uses day-of-year index into the flattened scripture readings array
- All users see the same "Tonight's Scripture" on the same day
- Changes at midnight (browser timezone)

### 8. Content Type Badges

All sleep session cards show a badge indicating content type to help users quickly distinguish between formats:
- Scripture readings: "Scripture" badge with BookOpen icon
- Bedtime stories: "Story" badge with Moon icon

---

## Auth Gating

| Element | Logged-Out Behavior | Logged-In Behavior |
|---------|--------------------|--------------------|
| Browse scripture collections (titles, references, durations) | Yes — full catalog visible | Yes |
| Browse bedtime stories (titles, descriptions, durations) | Yes — full catalog visible | Yes |
| See "Tonight's Scripture" featured card | Yes — visible with all details | Yes |
| Tap play on any scripture reading | Auth modal: "Sign in to listen to sleep content" | Audio loads and plays |
| Tap play on any bedtime story | Auth modal: "Sign in to listen to sleep content" | Audio loads and plays |
| Use scripture text toggle (BookOpen) | N/A — cannot play content | Opens/closes text panel |
| Scrub the progress bar | N/A — cannot play content | Seeks to position |
| Adjust foreground/background balance slider | N/A — cannot play content | Adjusts mix levels |
| See content switching confirmation dialog | N/A — cannot play content | Dialog appears when switching |

**Rationale:** Browse is fully open so logged-out visitors can see the richness of the sleep content library and be motivated to create an account. All playback interactions require login, consistent with the play-gate pattern from Specs 2 and 3.

---

## Responsive Behavior

### Mobile (< 640px)
- **"Tonight's Scripture" card:** Full width, no horizontal margin
- **Scripture collections:** Horizontal scroll, cards peek from the right edge to indicate scrollability
- **Bedtime stories:** 1 column grid, full-width cards
- **Progress bar:** Full width in drawer
- **Scripture text panel:** Full width, vertically scrollable
- **Balance slider:** Full width in drawer

### Tablet (640px - 1024px)
- **Scripture collections:** Horizontal scroll, 2-3 cards visible at once
- **Bedtime stories:** 2 column grid
- **Scripture text panel:** Full width, vertically scrollable

### Desktop (> 1024px)
- **Scripture collections:** Horizontal scroll, 3-4 cards visible at once
- **Bedtime stories:** 3 column grid
- **Scripture text panel:** Comfortable reading width, vertically scrollable
- **"Tonight's Scripture" card:** Constrained max-width, centered

---

## UX & Design Notes

- **Tone:** Calm, nighttime, sleep-forward. The browse experience should feel like settling in for the evening — warm, unhurried, inviting rest. This is not a high-energy content library; it's a bedtime companion.
- **Colors:** Use the design system dark palette. Scripture cards use subtle gradient backgrounds (not artwork-heavy like ambient scene cards). "Tonight's Scripture" featured card has an accent border (primary violet) to distinguish it from regular cards. Content type badges use soft, muted tones.
- **Typography:** Inter for all UI text (titles, badges, durations). Lora (serif) for the scripture text panel — this is spiritual/scriptural content. Story descriptions in regular weight Inter at slightly reduced opacity for a softer feel.
- **Card design:** Scripture cards are text-focused — title prominently displayed, reference below, small badges for duration and voice. No large images. Story cards are slightly larger to accommodate the 2-line description. Both card types have a play button that appears on hover (desktop) or is always visible (mobile).
- **Voice indicator:** Small icon next to the title — could be a simple male/female silhouette or a universal voice icon with "M"/"F" label. Subtle, informational, not dominant.
- **Progress bar:** Matches the visual style of volume sliders from the ambient mixer — purple fill on dark track. Elapsed/remaining times in small monospace or tabular numerals for alignment.
- **Balance slider:** Uses the same slider component style as volume sliders. Labels on each end: "Voice" (left) and "Ambient" (right).
- **Scripture text panel:** Dark glass aesthetic, semi-transparent background. Text in Lora serif. Active verse highlighted with a subtle background color or left border accent. Auto-scrolls gently to keep the active verse visible.
- **Content switching dialog:** Dark glass modal, centered. Focus-trapped. Clear, concise copy. Two buttons with obvious visual hierarchy ("Switch" as primary, "Keep Listening" as secondary).
- **Animations:** Gentle transitions only. Scripture text panel slides open/closed. Progress bar fill is smooth. No jarring animations — this is a sleep feature.

---

## AI Safety Considerations

- **Crisis detection needed?** No — this feature has no user text input. All content is curated and static.
- **User input involved?** No — users interact only through play buttons, sliders, and toggles. No text fields.
- **AI-generated content?** No — all scripture text is from the WEB translation (static data files). All story descriptions are curated. No AI generation occurs in this feature.
- **Scripture accuracy:** All scripture text must use the WEB (World English Bible) translation — verify every passage against the source text.
- **No `dangerouslySetInnerHTML`** — scripture text renders as plain text with safe rendering methods.
- **All content is stored in TypeScript data files** — not fetched from external sources.

---

## Auth & Persistence

- **Logged-out (demo mode):** Can browse all scripture collections and bedtime stories. Cannot play any content. Zero persistence — no cookies, no anonymous tracking, no localStorage writes.
- **Logged-in:** Can play content, use progress bar, toggle scripture text, adjust balance. Playback state lives in React context (AudioProvider). No database writes in this spec — saving/favoriting sleep sessions is Spec 7.
- **Route type:** Public — the Sleep & Rest browse component is part of a public page. Playback is auth-gated at the interaction level.

---

## Worship Room Safety

- All scripture text uses WEB (World English Bible) translation — verify every passage
- No user text input — crisis detection not applicable
- No `dangerouslySetInnerHTML` for scripture text — use safe text rendering
- Scripture text is stored in TypeScript data files, not fetched from external sources
- No database writes — all state is client-side
- Story descriptions use reverent, calming language consistent with the app's mission

---

## Out of Scope

- **Sleep timer and audio fade behavior** — timer countdown, auto-stop, gradual volume fade (Spec 5)
- **Music page shell and tab navigation** — the `/music/sleep` route, tab bar switching between Ambient/Sleep/Playlists (Spec 6)
- **Favoriting sleep sessions** — bookmarking readings/stories, persisting favorites to database (Spec 7)
- **Routines** — multi-step guided experiences that chain sleep content with scenes or meditation (Spec 8)
- **Actual TTS audio file generation** — real spoken audio for readings and stories (Spec 10 — use placeholder MP3 files)
- **Real bedtime story full text content** — narrative text for stories (Spec 10 — use placeholder descriptions only)
- **Backend API** — no server endpoints; all state is client-side
- **User-created sleep sessions** — users cannot create or customize readings/stories
- **Verse-by-verse audio timestamp data** — precise timing for verse-level highlight sync requires audio files (Spec 10 — use estimated timing for now)

---

## Acceptance Criteria

### Catalog Data
- [ ] Scripture readings data file contains 24 readings across 4 themed collections with all required metadata (id, title, reference, collection, WEB text, audio filename, duration, voice, tags)
- [ ] Bedtime stories data file contains 12 stories with all required metadata (id, title, description, audio filename, duration, voice, length category, tags)
- [ ] All scripture text in data files uses the WEB (World English Bible) translation
- [ ] Voice assignments alternate male/female within each collection
- [ ] Placeholder audio files are present for all 36 sessions (24 readings + 12 stories)

### "Tonight's Scripture" Daily Feature
- [ ] "Tonight's Scripture" section appears at the top of the Sleep & Rest browse area with a "Tonight's Scripture" label
- [ ] Featured card shows title, scripture reference, duration, and play button
- [ ] Featured card has a larger size and accent border distinguishing it from regular cards
- [ ] Featured reading changes each day (deterministic, same for all users on the same day)
- [ ] Rotation is client-side only — no backend dependency

### Scripture Collections Browse
- [ ] 4 collection sections displayed with headings ("Psalms of Peace", "Comfort & Rest", "Trust in God", "God's Promises")
- [ ] Each collection shows a horizontal-scrolling row of session cards
- [ ] Each scripture card shows: title, reference, duration badge, voice indicator (male/female icon), "Scripture" content type badge, play button
- [ ] Horizontal scroll works with touch/mouse/keyboard

### Bedtime Stories Browse
- [ ] "Bedtime Stories" section with heading appears below scripture collections
- [ ] Story cards show: title, description (2 lines, truncated), duration badge, length category label ("Short"/"Medium"/"Long"), voice indicator, "Story" content type badge, play button
- [ ] Story grid is responsive: 1 column on mobile (< 640px), 2 columns on tablet (640-1024px), 3 columns on desktop (> 1024px)

### Content Type Badges
- [ ] All scripture reading cards display a "Scripture" badge with BookOpen icon
- [ ] All bedtime story cards display a "Story" badge with Moon icon

### Auth Gating
- [ ] Logged-out user tapping play on any scripture reading sees auth modal: "Sign in to listen to sleep content"
- [ ] Logged-out user tapping play on any bedtime story sees auth modal: "Sign in to listen to sleep content"
- [ ] Logged-out users can freely browse all collections and stories (titles, descriptions, durations visible)

### Foreground Audio Playback
- [ ] Tapping play on a session (when logged in) loads audio via an HTML `<audio>` element
- [ ] Audio element is connected to the Web Audio API graph via MediaElementAudioSourceNode into foreground GainNode into Master GainNode
- [ ] Audio begins playing after loading
- [ ] Foreground audio survives mobile background/screen lock (HTML `<audio>` element behavior)
- [ ] Drawer now-playing section updates to show current title and voice indicator

### Content Switching Dialog
- [ ] When foreground content is already playing and user taps play on different content, confirmation dialog appears
- [ ] Dialog shows: "You're listening to [current title] ([remaining time] remaining). Start [new title] instead?"
- [ ] "Switch" button: current audio crossfades out over 2 seconds, new content loads and starts
- [ ] "Keep Listening" button: dismisses dialog, no change to playback
- [ ] Dialog has focus trapping and `role="alertdialog"`

### Foreground/Background Balance
- [ ] Balance slider appears in the drawer only when BOTH foreground content and ambient sounds are active
- [ ] Balance slider is hidden when only foreground or only ambient is playing
- [ ] At center position (0.5): voice and ambient play at equal levels
- [ ] At left extreme (0): voice at full volume, ambient muted
- [ ] At right extreme (1): ambient at full volume, voice muted
- [ ] Balance slider has `aria-label="Voice and ambient balance"` and `aria-valuetext` reflecting current percentages

### Progress Bar
- [ ] Progress bar appears in the drawer when foreground content is playing
- [ ] Progress bar shows purple fill on dark track (matching volume slider styling)
- [ ] Elapsed time shown on the left ("4:32"), remaining time on the right ("-8:15")
- [ ] Progress bar is scrubable — user can drag to seek forward/backward
- [ ] Audio continues playing during scrub (no pause-on-scrub)
- [ ] Progress bar has `role="slider"`, `aria-valuemin="0"`, `aria-valuemax` set to duration, `aria-valuenow` set to current time, `aria-label="Playback position"`
- [ ] Current content title and voice indicator displayed below the progress bar

### Scripture Text Toggle
- [ ] BookOpen icon toggle appears next to the content title in the drawer when a scripture reading is playing
- [ ] BookOpen icon is hidden when a bedtime story is playing
- [ ] Tapping the toggle opens a text panel that slides open below the progress bar
- [ ] Text panel shows the full WEB translation text of the current scripture reading
- [ ] Current verse is softly highlighted (subtle background color or left border accent)
- [ ] Text panel is hidden by default
- [ ] Toggle has `aria-expanded="true/false"` and `aria-controls` pointing to the text panel
- [ ] Text panel has `role="region"` and `aria-label="Scripture text"`
- [ ] Text panel is scrollable when content exceeds available space

### Accessibility
- [ ] Session cards have `role="button"` and descriptive `aria-label` (e.g., "Play Psalm 23: The Lord is My Shepherd, 5 minutes, male voice")
- [ ] "Tonight's Scripture" section has `aria-label="Tonight's featured scripture"`
- [ ] All interactive elements have minimum 44x44px touch targets
- [ ] Content switching confirmation dialog has focus trapping
