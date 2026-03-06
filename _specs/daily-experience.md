# Feature: Daily Experience (Hub with Tabbed Pray + Journal + Meditate)

## Overview

The Daily Experience is the spiritual heartbeat of Worship Room — a unified single-page experience at `/daily` that combines all three daily spiritual practices into one cohesive interface. The **Daily Hub** uses a **tabbed layout** (Pray | Journal | Meditate) so users can switch between practices without navigating away. The Pray tab is selected by default. Meditation sub-experiences (breathing timer, ACTS stepper, etc.) live on their own routes since they're immersive full-screen experiences.

The previous standalone routes (`/pray`, `/journal`, `/meditate`) redirect to `/daily` with the appropriate tab auto-selected via query params (e.g., `/pray` → `/daily?tab=pray`). This preserves existing links, quiz results, and bookmarks.

This spec covers the Daily Hub with its three tabs, plus the 6 meditation sub-experience pages, as one unified feature. They share completion tracking, context passing, auth gating patterns, shared routes, and the tab-based navigation system.

## User Stories

- As a user, I want a single daily page with tabs for Pray, Journal, and Meditate so I can move between practices without navigating away.
- As a user, I want to generate a personalized AI prayer based on what I'm feeling, so I can connect with God even when I don't know what to say.
- As a user, I want to journal freely or with a guided prompt, so I can process my thoughts and emotions with God.
- As a user, I want multiple meditation options (breathing, scripture soaking, gratitude, ACTS, Psalm reading, Examen), so I can find the practice that meets me where I am today.
- As a user, I want to see checkmarks when I complete a practice (logged-in only), so I feel a sense of accomplishment and motivation to continue.
- As a user, I want to share a verse or prayer with a friend via a beautiful shareable link, so I can encourage others and introduce them to Worship Room.

## Auth Gating Strategy

**Core principle:** Gate only AI features and save functionality. Everything else is accessible to all users.

### Logged-out users CAN:

- View the Daily Hub (greeting, verse, song, cards)
- Access the Journal page (both modes — guided prompts are static mock data, no AI cost)
- View the Pray page (see textarea, chips, classic prayers section)
- Read Aloud (TTS) on any content
- Use the share dropdown on verses and classic prayers
- Browse classic prayers (Copy, Read Aloud, Share)

### Logged-out users CANNOT (auth modal appears):

- Generate AI prayers (tapping "Generate Prayer" opens auth modal)
- Save prayers, journal entries, or any content
- Access the "Reflect on my entry" AI encouragement in Journal
- Access meditation sub-pages (clicking any meditation card or navigating directly shows auth modal / redirects to `/daily?tab=meditate`)
- Completion tracking still works via localStorage for logged-out users (checkmarks are local)

### Auth modal pattern:

- Same modal component used in Prayer Wall
- Triggered on: "Generate Prayer" button (logged-out), "Save" button (logged-out), "Reflect on my entry" (logged-out)
- Message varies by context: "Sign in to generate a prayer" / "Sign in to save your journal entries"

---

## 1. Daily Hub (`/daily`)

### Architecture: Tabbed Single-Page Layout

The Daily Hub is now a single page with three tabs that contain the full Pray, Journal, and Meditate experiences inline. Users never leave `/daily` except for immersive meditation sub-experiences.

**URL structure:** `/daily?tab=pray` | `/daily?tab=journal` | `/daily?tab=meditate`

- Default: `?tab=pray` (Pray tab selected when no param present)
- Changing tabs updates the query param (shareable, bookmarkable)
- React Router reads `searchParams` on load to set the active tab

**Route redirects:**

- `/pray` → redirects to `/daily?tab=pray`
- `/journal` → redirects to `/daily?tab=journal`
- `/meditate` → redirects to `/daily?tab=meditate`
- This preserves quiz result links, bookmarks, and any existing internal links

### Layout (Top to Bottom)

#### Hero Section (Always Visible)

- **Time-aware greeting**: "Good Morning!" / "Good Afternoon!" / "Good Evening!" (every word capitalized)
  - Morning: 12:00 AM – 11:59 AM
  - Afternoon: 12:00 PM – 4:59 PM
  - Evening: 5:00 PM – 11:59 PM
- **Personalized if logged in**: "Good Morning, Eric!"
- **Generic if logged out**: "Good Morning!"
- **Font**: Same font size as other page hero headings (Prayer Wall, Local Support, etc.)
- **Subtitle**: "Start with any practice below."
- **Quiz teaser**: Below subtitle: "Not sure where to start? Take a 30-second quiz and we'll help you find your path." — "Take a 30-second quiz" is a clickable link that smooth-scrolls to the quiz section at the bottom of the page
- **Purple gradient hero**: Consistent with all other page heroes

#### Tab Bar (Always Visible — Sticky)

- **3 tabs**: Pray | Journal | Meditate
- **Style**: Horizontal tab bar with underline indicator
  - Active tab: Purple text (`#6D28D9`) + purple underline (2-3px) that animates/slides to the active tab
  - Inactive tabs: Grey text
  - Font: Inter semi-bold, large enough to be prominent
- **Sticky behavior**: Tabs stick below the hero when the user scrolls down. Subtle bottom shadow appears when scrolling to separate tabs from content. This keeps tabs always accessible without scrolling back up.
- **Mobile**: Tabs span full width, evenly distributed. Same sticky behavior.
- **No icons on tabs** — just text labels (Pray, Journal, Meditate)
- **Tab switching**: Updates URL query param. Content area swaps with a subtle crossfade animation (150-200ms opacity transition).

#### Tab Content Area

- **Swaps based on active tab**: Only one tab's content is visible at a time
- **Pray tab**: Full Pray experience (see Section 2)
- **Journal tab**: Full Journal experience (see Section 3)
- **Meditate tab**: Full Meditate experience with 6 cards (see Section 4). Tapping a meditation card navigates to its dedicated sub-page route.
- **Content preserves state**: If a user starts typing in Pray, switches to Journal, then switches back to Pray, their text should still be there (React state preserved, components not unmounted — or use localStorage draft persistence)

#### Today's Song Pick Section (Below Tab Content — Always Visible)

- **Dark purple background section** with white decorative divider under the heading
- **"Today's Song Pick" heading**: Same font styling as "See How You're Growing" on the homepage
- **Spotify embed (352px height)**: Larger embed showing album art. Centered.
- **Source**: 30 hardcoded Spotify track IDs from Eric's playlist (https://open.spotify.com/playlist/5Ux99VLE8cG7W656CjR2si), rotating daily
- **"Follow Our Playlist" button**: White background, purple text (`#6D28D9`), rounded corners. Links to the playlist URL.
- **"Join 117K+ other followers!"**: Small white text below the button
- **No Spotify API required** — embed iframe with hardcoded track IDs

#### Starting Point Quiz Section (Below Song Pick — Always Visible)

- **Exact copy of the Starting Point Quiz** from the homepage
- **Same component**: Reuse/share the quiz component between homepage and Daily Hub
- **All 7 result links work**: Pray → `/daily?tab=pray`, Journal → `/daily?tab=journal`, Meditate → `/daily?tab=meditate`, Music → `/music`, Sleep & Rest → `/music/sleep`, Prayer Wall → `/prayer-wall`, Local Support → `/local-support/churches`
- **`id="quiz"`** on the container for smooth-scroll targeting from the hero teaser link

#### Footer (Always Visible)

- Standard site footer with "Listen on Spotify" badge linking to the playlist

### Page Section Order (Top to Bottom)

1. Hero (greeting + subtitle + quiz teaser)
2. Tab bar (Pray | Journal | Meditate — sticky)
3. Active tab content (full Pray, Journal, or Meditate experience)
4. Today's Song Pick (dark purple section, Spotify embed, Follow Our Playlist button)
5. Starting Point Quiz (`id="quiz"`)
6. Footer

### Completion Tracking

- **Storage**: localStorage key structure:
  ```json
  {
    "date": "2026-03-03",
    "pray": true,
    "journal": true,
    "meditate": {
      "completed": true,
      "types": ["breathing", "gratitude"]
    }
  }
  ```
- **Reset**: At midnight local time, check the stored date. If it's not today, all checkmarks reset.
- **Checkmarks visible only for logged-in users** (hidden when `isLoggedIn` is false). Completion tracking still writes to localStorage behind the scenes for when auth is wired up.
- **Future**: This localStorage structure will be replaced with backend API calls. The UI reads the same data shape regardless of source.
- **Future (noted, not in this spec)**: Points/gamification system will build on this tracking. Midnight reset supports daily point earning.

### Shared Verse Page (`/verse/:id`)

- **Route**: `/verse/:id` where id maps to a verse in the curated set
- **Layout**: Purple gradient hero with verse in Lora serif (white), verse reference below, Worship Room branding/logo
- **Spotify embed**: Compact embed below the hero ("While you're here, listen to today's worship pick")
- **"Follow our playlist on Spotify" CTA** below embed
- **CTAs**: Primary "Explore Worship Room →" linking to `/` (landing page). Secondary "Start your daily time with God →" linking to `/daily`
- **Open Graph meta tags**: Title = verse reference, Description = verse text (truncated), Image = branded card (future: auto-generated image)
- **Public page**: No auth required. This is a marketing/sharing page.

---

## 2. Pray Tab (inside `/daily?tab=pray`)

### Tab Content Layout (Top to Bottom)

The Pray tab content renders inside the Daily Hub's tab content area. It does NOT have its own hero section — the Daily Hub hero and tab bar are above it.

#### "What's On Your Heart?" Heading

- **Heading**: "What's On Your **Heart?**" with "Heart?" in purple (`#6D28D9`) italic, rest in dark text
- **Same styling** as the purple-highlighted-word pattern used elsewhere (e.g., "Your Journey to **Healing**")
- **Grey squiggle background** behind this entire section (same pattern as Journey to Healing, stretched horizontally)
- **Cyan glow** around the textarea (same glow effect as the homepage hero input)

#### Starter Chips

- **3 chips visible** in a single row above the textarea: "I'm struggling with...", "Help me forgive...", "I feel lost about..."
- **Behavior**: Tap a chip → fills textarea with that phrase, cursor placed at end for continued typing
- **After tapping**: Chips disappear to reduce visual noise

#### Input Section

- **Textarea**: Starts at 2-3 lines, auto-expands as user types
- **Placeholder**: "Start typing here..."
- **Character limit**: Reasonable limit for AI cost control (500 characters)
- **Validation**: Require at least some text input. If empty, show gentle nudge: "Tell God what's on your heart — even a few words is enough."
- **Nonsensical/short input** (e.g., "idk"): Accept gracefully. AI (or mock) generates a general prayer for clarity and peace.
- **"Generate Prayer" button**: Primary CTA below textarea
  - Logged out: Opens auth modal ("Sign in to generate a prayer")
  - Logged in: Submits for prayer generation

#### Loading State

- After tapping "Generate Prayer": textarea collapses, animated "Generating prayer for you..." message appears with subtle animation

#### Generated Prayer Display

- **Visual separator**: Divider line or label ("Your prayer:") between input area and prayer
- **User's input collapses** to focus on the prayer
- **Font**: Lora serif for prayer text, Inter for everything else
- **Structure**: Always starts with "Dear God," and ends with "Amen."
- **Length**: Medium (5-8 sentences, one solid paragraph). No length selector.
- **Display**: All at once (no line-by-line reveal)

#### Action Buttons

- **Primary row** (icon buttons): Copy, Read Aloud, Save
  - Save (logged-out): Auth modal
  - Save (logged-in): Saves the generated prayer text. Saved prayers accessible from a future "My Saved Prayers" section and from the Dashboard.
- **Read Aloud**: Browser Speech Synthesis API (free). Play/Pause/Stop controls. Karaoke-style word-by-word highlighting as text is read.
- **Below the prayer**: "Journal about this →" text CTA (switches to Journal tab with context: updates query param to `?tab=journal` and passes topic via React state)
- **Share dropdown**: Same pattern as Prayer Wall (copy link, email, SMS, Facebook, X). Shares a link to `/prayer/:id`
- **"Pray about something else"**: Subtle text link. Resets the section — textarea expands, chips reappear, prayer clears.
- **Mobile layout**: Primary 3 icon buttons visible + "More" overflow menu for Share and other actions

#### Classic Prayers Section

- **Collapsible section** below the AI prayer area (collapsed by default)
- **Title**: "Classic Prayers"
- **Thin grey divider line** above AND below the section (both collapsed and expanded states)
- **6 curated prayers**:
  1. The Lord's Prayer (Matthew 6:9-13)
  2. Serenity Prayer (Reinhold Niebuhr)
  3. Prayer of St. Francis ("Make me an instrument of your peace")
  4. Psalm 23 ("The Lord is my shepherd")
  5. Prayer for Peace (St. Patrick's Breastplate, shortened)
  6. A Prayer for Healing (curated from public domain source)
- **Each prayer**: Title, attribution, full text in a styled card
- **Action buttons per prayer**: Copy, Read Aloud, Share (no Save — classic prayers don't need saving)

#### Navigation Cards (Below Classic Prayers)

- **2 cards side by side** below the Classic Prayers section, styled identically to the Daily Hub practice cards
- **Card 1 — Journal**: Lucide PenLine icon, title "Journal", description "Put your thoughts into words. Guided prompts help you reflect on what God is doing in your life." Switches to Journal tab (`?tab=journal`)
- **Card 2 — Meditate**: Lucide Wind icon, title "Meditate", description "Quiet your mind with guided meditations rooted in Biblical truth. Let peace settle in." Switches to Meditate tab (`?tab=meditate`)
- **Desktop**: Side by side. **Mobile**: Stacked vertically.

#### Crisis Keyword Detection

- **Runs on textarea input** (same shared utility as Prayer Wall)
- **Conservative keywords only** — explicit, unambiguous crisis language:
  - Self-harm: "I want to kill myself," "I want to die," "end my life," "suicide," "self-harm," "cutting myself"
  - Abuse: "being abused," "being hurt by"
  - NOT vague emotional phrases like "nobody cares," "I feel hopeless" (these are normal expressions the app is designed to support)
- **Action**: Non-blocking banner with crisis resources (988 Suicide & Crisis Lifeline, Crisis Text Line: text HOME to 741741). User can continue typing and submitting.

### Shared Prayer Page (`/prayer/:id`)

- **Route**: `/prayer/:id`
- **Layout**: Identical to `/verse/:id` — purple gradient hero with prayer text in Lora serif, Worship Room branding
- **Spotify embed + "Follow our playlist" CTA** below hero
- **CTAs**: Primary "Explore Worship Room →" to `/`, secondary "Start your daily time with God →" to `/daily`
- **Open Graph meta tags**: Title = "A Prayer from Worship Room", Description = first 150 chars of prayer text
- **Public page**: No auth required

### Completion Signal

- When a prayer is generated (mock or real), write `pray: true` to the Daily completion localStorage key

### Mock Data (Frontend-First)

- 8-10 pre-written mock prayer responses covering: anxiety, gratitude, healing, guidance, grief, forgiveness, relationships, strength
- All follow "Dear God... Amen" structure, similar medium length
- Mock response selected based on topic keyword matching from user input (fallback to a general prayer)
- Simulated loading delay (1-2 seconds) for realistic feel

---

## 3. Journal Tab (inside `/daily?tab=journal`)

### Tab Content Layout (Top to Bottom)

The Journal tab content renders inside the Daily Hub's tab content area. It does NOT have its own hero section.

#### "What's On Your Mind?" Heading

- **Heading**: "What's On Your **Mind?**" with "Mind?" in purple (`#6D28D9`) italic, rest in dark text
- **Same styling** as the Pray tab's "What's On Your Heart?" heading
- **Grey squiggle background** behind this entire section

#### Mode Toggle

- **Toggle at top**: "Guided" | "Free Write"
- **Default**: Guided (helps users who don't know where to start)
- **Remembers preference**: localStorage stores last-used mode
- **Switching modes**: Preserves existing text in the textarea (text is never lost on toggle)

#### Guided Mode

- **AI prompt** displayed above textarea in a styled card (soft background, distinct from the writing area)
- **Prompt content**: From a curated list of 15-20 mock prompts covering themes: gratitude, anxiety, healing, relationships, forgiveness, hope, identity, purpose, grief, peace, trust, patience, joy, strength, surrender
- **"Try a different prompt"**: Text link below the prompt card. Shuffles to a different prompt from the list.
- **Context from other practices**: If switching from Pray tab after tapping "Journal about this →" (context passed via React state), show a banner: "Continuing from your prayer about anxiety" with a contextual prompt. "Write about something else" link dismisses the banner and shows a standard prompt. This automatically opens in Guided mode.

#### Free Write Mode

- Prompt card disappears. Just the textarea.
- If switching with context from Pray tab, a subtle note appears at top: "Continuing from your prayer about anxiety" with dismiss link. But no AI prompt — just the note for context.

#### Textarea

- Plain text, large Lora serif font
- Auto-expands as user types
- **Character limit**: 5,000 characters (roughly 750-1,000 words)
- **Auto-save draft**: Saves to localStorage as they type. Subtle "Draft saved" indicator (accessible to screen readers via aria-live). Draft persists if they close the tab and return. Draft clears after explicit save.

#### Crisis Keyword Detection

- Same shared utility and conservative keyword list as Pray page
- Non-blocking banner with crisis resources

#### Save Entry

- **"Save Entry" button**: Below textarea
  - Logged out: Auth modal ("Sign in to save your journal entries")
  - Logged in: Entry saves. Textarea becomes read-only showing the saved entry.
- **After saving**:
  - "Reflect on my entry" button appears below the saved entry
  - "Write another" button appears below
  - New timestamp generated when "Write another" is tapped
  - Previous saved entries from today stack below (all visible)

#### Reflect on My Entry

- **Button** (not automatic): "Reflect on my entry"
- Logged out: Auth modal
- Logged in: Mock AI encouragement appears inline below the entry in a styled card (2-3 sentence warm, encouraging reflection)
- Button appears on every saved entry — user can get a reflection on each one
- **Mock data**: 8-10 rotating mock reflections for realistic testing

#### Done Journaling

- **"Done journaling" button/link**: Appears after at least one entry is saved
- Shows handoff CTAs: "Continue to Meditate" (switches to Meditate tab) and "Visit the Prayer Wall" (`/prayer-wall`) as secondary text links
- CTAs only appear on this explicit "done" action, not after every individual save

### Completion Signal

- When an entry is saved, write `journal: true` to the Daily completion localStorage key

### Mock Data

- 15-20 guided prompts covering the theme spectrum
- 8-10 mock AI reflections (warm, encouraging, 2-3 sentences each)

---

## 4. Meditate Tab (inside `/daily?tab=meditate`)

### Tab Content Layout

The Meditate tab content renders inside the Daily Hub's tab content area. It does NOT have its own hero section.

#### Intro Section

- **Text**: "Take a moment to slow down and be present with God. Choose how you'd like to be still today."
- **Just text**, no illustration or icon

#### Meditation Grid

- **6 cards** in a 2-column grid (desktop and mobile)
  - Desktop: 2 columns, 3 rows
  - Mobile: 2 columns, 3 rows (smaller cards)
- **Each card**: Lucide icon, title, one-line description, time estimate, individual green checkmark if completed today
- **Cards**:

| #   | Title                | Icon       | Description                                                                             | Time      |
| --- | -------------------- | ---------- | --------------------------------------------------------------------------------------- | --------- |
| 1   | Breathing Exercise   | Wind       | A guided 4-7-8 breathing pattern with scripture                                         | 2-10 min  |
| 2   | Scripture Soaking    | BookOpen   | Sit quietly with a single verse and let it sink in                                      | 2-10 min  |
| 3   | Gratitude Reflection | Heart      | Name the things you're thankful for today                                               | 5 min     |
| 4   | ACTS Prayer Walk     | Footprints | A four-step guided prayer through Adoration, Confession, Thanksgiving, and Supplication | 10-15 min |
| 5   | Psalm Reading        | Scroll     | Read through a Psalm slowly, one verse at a time                                        | 5-10 min  |
| 6   | Examen               | Search     | A five-step evening reflection on your day with God                                     | 10-15 min |

- **Tap a card** → navigates to that meditation's full-screen experience route (e.g., `/meditate/breathing`). These are the only routes that leave the `/daily` page.
- **Individual checkmarks**: Each card gets its own green ✓ when completed today (tracked in localStorage under `meditate.types` array)

#### All-6-Complete Celebration

- If all 6 meditation types have checkmarks for today, show a celebratory message above or below the grid: "You completed all 6 meditations today! What a beautiful time with God." with a gentle golden glow animation
- Happens **every day** they achieve it (not just first time)

#### Completion Signal (Hub)

- Completing **any one** meditation type writes `meditate.completed: true` to the Daily hub localStorage. The Meditate card on the Daily hub gets a single checkmark regardless of how many types are completed.

---

### 4a. Breathing Exercise

#### Pre-Start Screen

- **What to expect**: "You'll follow a 4-7-8 breathing pattern: breathe in for 4 seconds, hold for 7, breathe out for 8. A scripture verse will be displayed to focus your mind."
- **Duration selector**: 3 buttons — 2 min, 5 min, 10 min. No default pre-selected; user must choose.
- **Voice guidance toggle**: On by default. When enabled, voice cues say "Breathe in," "Hold," "Breathe out" at each phase transition.
- **Chime toggle**: On by default, with mute option. Gentle chime at each phase transition (supports eyes-closed users).
- **Scripture verse**: NOT shown on pre-start screen. Revealed when exercise begins.
- **"Begin" button**: Disabled until duration is selected.

#### During Exercise

- **Visual**: Expanding/contracting circle with soft violet glow (from design system primary color)
  - Circle expands during "Breathe in" (4 seconds)
  - Circle holds at full size during "Hold" (7 seconds)
  - Circle contracts during "Breathe out" (8 seconds)
- **Phase labels + countdown**: "Breathe in 4...3...2...1" / "Hold 7...6...5...4...3...2...1" / "Breathe out 8...7...6...5...4...3...2...1"
- **Scripture verse**: Displayed below the circle. Random selection from curated pool of 20 calming/peace-focused verses (WEB translation). Same verse for the entire exercise session.
- **Chime**: Gentle chime sound at each phase transition (if enabled)
- **Voice guidance**: "Breathe in... Hold... Breathe out..." spoken at transitions (if enabled)
- **Wake Lock API**: Keeps screen awake on mobile during exercise (free browser API)
- **Mobile**: Circle sized smaller to leave room for phase label and verse text below
- **Navigation away**: "Leave exercise?" confirmation dialog if user clicks navbar or browser back. If they return later, offer "Resume" or "Restart" options.
- **Accessibility**: aria-live region announces "Breathe in," "Hold," "Breathe out" for screen readers

#### Completion Screen

- **Message**: "Well done!"
- **Mini Daily hub cards**: Show all 3 practice cards (Pray, Journal, Meditate) with updated checkmarks
- **CTAs**: "Meditate more (same exercise)" / "Try a different meditation" / "Continue to Pray →" / "Continue to Journal →" / "Visit the Prayer Wall →"
- **Writes to localStorage**: Adds "breathing" to `meditate.types` array, sets `meditate.completed: true`

#### Verse Pool (Breathing)

- 20 curated calming/peace-focused verses (WEB translation)
- Themes: peace, rest, trust, comfort, God's presence
- Random selection each time exercise starts

---

### 4b. Scripture Soaking

#### Pre-Start Screen

- **Explainer for new users**: "Scripture soaking is the practice of sitting quietly with a single verse, letting its meaning wash over you. No analyzing — just being present with God's word."
- **Verse**: App-suggested from a curated pool of 20 deeper/reflective verses (separate pool from breathing). NOT shown until "Begin" is tapped.
- **"Try another verse" button**: Shuffles to a different verse. Previous verse excluded so no immediate repeat.
- **Duration selector**: 3 buttons — 2 min, 5 min, 10 min. No default; user must choose.
- **"Begin" button**: Disabled until duration selected.

#### During Exercise

- **Verse display**: Single verse in large Lora serif text, regular screen (NO dimming/focus mode)
- **Timer**: Subtle progress bar at bottom of screen
- **Pause**: User can pause the timer
- **Chime**: Soft chime when timer completes
- **Wake Lock API**: Active on mobile

#### Completion Screen

- Same pattern as Breathing Exercise: "Well done!" + mini hub cards + CTAs
- **Writes to localStorage**: Adds "soaking" to `meditate.types` array

#### Verse Pool (Scripture Soaking)

- 20 curated deeper/reflective verses (WEB translation)
- Themes: identity, love, purpose, hope, strength, God's faithfulness
- Separate pool from breathing verses (though some overlap is acceptable)
- Shuffle excludes the previous verse

---

### 4c. Gratitude Reflection

#### Flow

1. **3 text fields**: Each with placeholder "I'm grateful for..."
2. After all 3 are filled: **"+ Add another"** button appears. No upper limit — user can add as many as they want.
3. **Untimed** — user submits when ready via "Done" button
4. **Completion screen**:
   - Warm affirmation (rotating from a set of 3-5, e.g., "You named 5 things you're grateful for today. What a beautiful heart.")
   - Related scripture verse (rotating from a small curated set of gratitude-themed verses)
   - Mini Daily hub cards with updated checkmarks
   - CTAs: same pattern as other meditations
5. **Writes to localStorage**: Adds "gratitude" to `meditate.types` array

#### Content

- 3-5 rotating affirmation messages (count-aware: "You named {n} things...")
- 3-5 gratitude-themed scripture verses (WEB)

---

### 4d. ACTS Prayer Walk

#### Flow — Stepper/Wizard (Step 1 of 4)

- **Progress indicator**: "Step 1 of 4: Adoration" at the top
- **One step per screen** (not one scrollable page)

#### Steps

**Step 1 — Adoration**

- Prompt: "Begin by praising God for who He is. Think about His character — His love, faithfulness, power, mercy. What about God fills you with awe?"
- Supporting scripture verse (WEB)
- Optional: "Add a note" expandable textarea (ephemeral — disappears after session)

**Step 2 — Confession**

- Prompt: "Take a moment to honestly bring before God anything weighing on your conscience. He already knows — this is about releasing it. What do you need to lay down?"
- Supporting scripture verse (WEB)
- Optional note textarea

**Step 3 — Thanksgiving**

- Prompt: "Shift your heart to gratitude. What has God done for you recently? What blessings — big or small — can you thank Him for?"
- Supporting scripture verse (WEB)
- Optional note textarea

**Step 4 — Supplication**

- Prompt: "Now bring your requests to God. What do you need? What are you hoping for? Who in your life needs prayer right now?"
- Supporting scripture verse (WEB)
- Optional note textarea

#### Navigation

- **Next + Previous + Skip**: Maximum flexibility. User can go back, skip ahead, or proceed in order.
- **Notes are ephemeral**: Not saved anywhere. They exist only during the session.

#### Completion

- After Step 4 (or if all steps are skipped/visited): Completion screen with "Well done!" + mini hub cards + CTAs
- **Writes to localStorage**: Adds "acts" to `meditate.types` array

---

### 4e. Psalm Reading

#### Psalm Selection

- **Scrollable list of cards**: 15 curated Psalms
- Each card: Psalm number, theme title, one-line description
- Example: "Psalm 23 — A psalm of David about God's faithful care and provision"
- Suggested Psalms: 23, 27, 34, 46, 51, 63, 91, 100, 103, 121, 139, 145, 119 (sectioned), 42, 62

#### Reading Flow

- **One verse at a time**: Large Lora serif text
- **Progress indicator**: "Verse 3 of 12"
- **Navigation**: Previous + Next buttons. Self-paced (no timer).
- **Brief intro** before verse 1: Theme description and historical context for the Psalm

#### Psalm 119 Handling

- Sectioned into 22 parts of 8 verses each (traditional Hebrew letter divisions)
- Selection screen shows: "Psalm 119: Aleph (vv. 1-8)" / "Psalm 119: Beth (vv. 9-16)" / etc.
- After completing a section: "Continue to next section" option + standard completion screen
- User can also return to section selection to pick a different section

#### Completion

- After final verse: "Well done!" + mini hub cards + CTAs
- For Psalm 119: Completing any one section counts as complete
- **Writes to localStorage**: Adds "psalm" to `meditate.types` array

#### Content

- All 15 Psalms in full (WEB translation)
- Complete text including all verses (even long ones)
- Brief intro/description for each Psalm

---

### 4f. Examen

#### Intro Note

- Soft note on the pre-start screen: "The Examen is traditionally an evening practice — perfect for winding down your day."
- Available anytime (not time-gated)

#### Flow — Stepper/Wizard (Step 1 of 5)

- **Progress indicator**: "Step 1 of 5: Gratitude"
- **One step per screen** (mirrors ACTS pattern for consistency)

#### Steps

**Step 1 — Gratitude**

- Prompt: "Begin by thanking God for the gifts of this day. What moments — however small — brought you joy or peace?"
- Optional: "Add a note" expandable textarea (ephemeral)

**Step 2 — Review**

- Prompt: "Walk through your day slowly, from morning to now. What stands out? What moments felt significant?"
- Optional note textarea

**Step 3 — Emotions**

- Prompt: "As you review your day, what emotions surface? Where did you feel joy, frustration, peace, anxiety, love, or sadness?"
- Optional note textarea

**Step 4 — Focus**

- Prompt: "Choose one moment from your day that stands out most. Sit with it. What is God showing you through this moment?"
- Optional note textarea

**Step 5 — Look Forward**

- Prompt: "As you look toward tomorrow, what are you hoping for? What do you need from God? Offer tomorrow to Him."
- Optional note textarea

#### Navigation

- **Next + Previous + Skip**: Same as ACTS. Identical UX for consistency.
- **Notes are ephemeral**

#### Completion

- "Well done!" + mini hub cards + CTAs
- **Writes to localStorage**: Adds "examen" to `meditate.types` array

---

## Cross-Cutting Concerns

### Context Passing Between Tabs

- **Mechanism**: React state within the Daily Hub component. When switching from Pray to Journal via "Journal about this →", the Hub component passes context (topic, source) to the Journal tab via shared state or a context provider.
- **For meditation sub-pages returning to Hub**: React Router state (`navigate('/daily?tab=meditate', { state: { completedType: 'breathing' } })`)
- **No URL clutter**: Context lives in component state or router state, not in query params beyond the tab param
- **Easy to migrate**: When backend exists, context can come from API instead

### Handoff CTAs After Each Practice

**After Pray (within tab):**

- "Journal about this →" (switches to Journal tab with context)
- Share dropdown, "Pray about something else" link
- Navigation cards: Journal and Meditate (switch tabs)

**After Journal (on "Done journaling" within tab):**

- "Continue to Meditate" (switches to Meditate tab)
- "Visit the Prayer Wall" (`/prayer-wall`)

**After each Meditation type (on sub-page completion screen):**

- "Meditate more (same exercise)" / "Try a different meditation" (back to `/daily?tab=meditate`)
- "Continue to Pray →" (`/daily?tab=pray`) / "Continue to Journal →" (`/daily?tab=journal`) / "Visit the Prayer Wall →" (`/prayer-wall`)

### Completion Screen Pattern (Shared)

- All completion screens follow the same layout:
  1. Warm "Well done!" message
  2. Mini Daily hub cards showing updated checkmarks (Pray ✓, Journal, Meditate ✓)
  3. Contextual CTAs for next actions
- Mini hub cards are tappable — navigate to the respective practice page

### Read Aloud (TTS) Pattern

- **API**: Browser Speech Synthesis API (free, built-in, no cost)
- **Controls**: Play / Pause / Stop
- **Visual**: Karaoke-style word-by-word highlighting as text is read
- **Available on**: Generated prayers, classic prayers, scripture verses, journal entries
- **Accessibility**: Standard ARIA labels on controls

### Share Dropdown Pattern

- Same component across all shareable content (verses, prayers, classic prayers)
- Options: Copy link, Email, SMS, Facebook, X
- Desktop: Dropdown menu
- Mobile: Web Share API with fallback to dropdown
- Shares a URL to the relevant shared route (`/verse/:id` or `/prayer/:id`)

### Crisis Keyword Detection

- **Applies to**: Pray textarea, Journal textarea only (not Gratitude fields, not ACTS/Examen notes)
- **Keyword list**: Conservative, explicit crisis language only
  - "I want to kill myself," "I want to die," "end my life," "suicide," "self-harm," "cutting myself," "being abused," "being hurt by"
  - NOT vague emotional phrases ("nobody cares," "I feel hopeless")
- **Action**: Non-blocking informational banner with:
  - 988 Suicide & Crisis Lifeline (call or text 988)
  - Crisis Text Line (text HOME to 741741)
- **Shared utility**: Same keyword list and banner component used across Pray, Journal, and Prayer Wall

### Bible Translation

- **WEB (World English Bible)** for ALL scripture content: Verse of the Day, breathing exercise verses, scripture soaking verses, ACTS supporting verses, Psalm reading, Gratitude reflection verses
- Modern English, fully public domain, no licensing required
- **Note**: Landing page quiz may currently use a different translation. Update to WEB for consistency (separate task, not in this spec).

### Accessibility

- All interactive elements have proper ARIA labels
- Breathing exercise circle: aria-live region announces "Breathe in," "Hold," "Breathe out"
- Journal auto-save indicator: aria-live for screen reader announcement
- Keyboard navigation for all steppers (ACTS, Examen), toggles, and cards
- Standard label + ARIA for all textareas and inputs
- Read Aloud controls fully keyboard-accessible and labeled

### Mobile-Specific

- Daily Hub: Full-width hero, tabs span full width, sticky tab bar on scroll
- Pray tab: Starter chips in single row, cyan glow on textarea. Action buttons: primary 3 visible + "More" overflow menu.
- Journal tab: Full-width textarea, toggle and prompt card stack naturally
- Meditate tab: 2-column grid for the 6 cards. Breathing circle sized for mobile with text below (not overlaid).
- Meditation sub-pages: Wake Lock API active during breathing exercise and scripture soaking
- "Leave exercise?" confirmation on navigation during active meditation

---

## Mock Data Summary

All features are frontend-first with mock data. No backend or AI integration required.

| Content                    | Count                | Notes                                         |
| -------------------------- | -------------------- | --------------------------------------------- |
| Verse of the Day           | 30 verses            | WEB, randomized themes, day-of-month rotation |
| Song of the Day            | 30 Spotify track IDs | From Eric's playlist, independent rotation    |
| Mock AI prayers            | 8-10                 | Topic-matched, "Dear God...Amen" structure    |
| Guided journal prompts     | 15-20                | Covering emotional/spiritual theme spectrum   |
| Mock journal reflections   | 8-10                 | Warm, encouraging, 2-3 sentences              |
| Breathing exercise verses  | 20                   | Calming/peace themes, WEB                     |
| Scripture soaking verses   | 20                   | Deeper/reflective themes, WEB, separate pool  |
| Classic prayers            | 6                    | Full text, static content                     |
| Gratitude affirmations     | 3-5                  | Count-aware rotating messages                 |
| Gratitude scripture verses | 3-5                  | Gratitude-themed, WEB                         |
| ACTS supporting verses     | 4                    | One per step, WEB                             |
| Psalms                     | 15 complete          | Full text, WEB, with intros                   |
| Examen prompts             | 5                    | Static text (already defined in spec)         |

### What's Real (Not Mocked)

- All UI, navigation, layout, and interactions
- Breathing exercise timer, circle animation, chimes, voice guidance
- Scripture soaking timer and progress bar
- Journal text editor with draft persistence (localStorage)
- Completion tracking (localStorage) with checkmark display
- Crisis keyword detection (shared utility)
- Share dropdown and share route pages
- Spotify embed (real embed, hardcoded track IDs)
- Read Aloud TTS (real browser API)
- Wake Lock API (real browser API)
- Responsive design (mobile, tablet, desktop)
- All accessibility features
- "Leave exercise?" confirmation dialogs

---

## Routes Summary

| Route                 | Page                               | Auth Required                     | Notes                              |
| --------------------- | ---------------------------------- | --------------------------------- | ---------------------------------- |
| `/daily`              | Daily Hub (tabbed)                 | No                                | Default tab: Pray                  |
| `/daily?tab=pray`     | Daily Hub → Pray tab               | No (AI generation requires login) |                                    |
| `/daily?tab=journal`  | Daily Hub → Journal tab            | No (saving requires login)        |                                    |
| `/daily?tab=meditate` | Daily Hub → Meditate tab           | No                                |                                    |
| `/pray`               | Redirect                           | —                                 | Redirects to `/daily?tab=pray`     |
| `/journal`            | Redirect                           | —                                 | Redirects to `/daily?tab=journal`  |
| `/meditate`           | Redirect                           | —                                 | Redirects to `/daily?tab=meditate` |
| `/meditate/breathing` | Breathing Exercise (full-screen)   | No                                |                                    |
| `/meditate/soaking`   | Scripture Soaking (full-screen)    | No                                |                                    |
| `/meditate/gratitude` | Gratitude Reflection (full-screen) | No                                |                                    |
| `/meditate/acts`      | ACTS Prayer Walk (full-screen)     | No                                |                                    |
| `/meditate/psalms`    | Psalm Reading (full-screen)        | No                                |                                    |
| `/meditate/examen`    | Examen (full-screen)               | No                                |                                    |
| `/verse/:id`          | Shared verse page                  | No                                |                                    |
| `/prayer/:id`         | Shared prayer page                 | No                                |                                    |

---

## Acceptance Criteria

### Daily Hub

- [ ] Time-aware personalized greeting displays correctly with proper capitalization
- [ ] Purple gradient hero matches other page heroes
- [ ] Quiz teaser smooth-scrolls to quiz section
- [ ] Tab bar displays Pray | Journal | Meditate with purple underline on active tab
- [ ] Tab bar is sticky below hero when scrolling
- [ ] Switching tabs updates URL query param (`?tab=pray`, `?tab=journal`, `?tab=meditate`)
- [ ] Tab content swaps with crossfade animation
- [ ] Tab content preserves state when switching (typing in Pray persists when switching to Journal and back)
- [ ] Default tab is Pray when no query param present
- [ ] `/pray` redirects to `/daily?tab=pray`
- [ ] `/journal` redirects to `/daily?tab=journal`
- [ ] `/meditate` redirects to `/daily?tab=meditate`
- [ ] Spotify embed plays a song from the curated playlist in the Song Pick section
- [ ] "Follow Our Playlist" button links to the correct Spotify playlist
- [ ] "Join 117K+ other followers!" text displays below button
- [ ] Starting Point Quiz works with all 7 result links
- [ ] Checkmarks hidden for logged-out users, visible for logged-in
- [ ] Checkmarks reset at midnight local time
- [ ] Footer displays on the page
- [ ] White decorative dividers display under section headings
- [ ] Responsive: tabs span full width on mobile, sticky behavior works

### Pray Tab

- [ ] "What's On Your Heart?" heading with purple "Heart?" displays correctly
- [ ] Grey squiggle background behind the section
- [ ] 3 starter chips display; tapping one fills textarea and hides chips
- [ ] Cyan glow on textarea
- [ ] Empty submit shows gentle nudge message
- [ ] Logged-out: "Generate Prayer" opens auth modal
- [ ] Logged-in: Generates prayer with animated loading state
- [ ] Generated prayer displays in Lora serif with "Dear God...Amen" structure
- [ ] Action buttons work (Copy, Read Aloud, Save, Share, Regenerate)
- [ ] "Journal about this →" switches to Journal tab with context
- [ ] Read Aloud uses browser TTS with play/pause/stop and karaoke highlighting
- [ ] "Pray about something else" resets section with chips visible
- [ ] Classic prayers collapsible section with divider lines above and below
- [ ] Navigation cards (Journal, Meditate) display below Classic Prayers and switch tabs
- [ ] Crisis keyword detection shows non-blocking banner
- [ ] Completion signal writes to localStorage
- [ ] `/prayer/:id` shared page renders correctly with OG tags

### Journal Tab

- [ ] "What's On Your Mind?" heading with purple "Mind?" displays correctly
- [ ] Grey squiggle background behind the section
- [ ] Toggle defaults to Guided; remembers preference in localStorage
- [ ] Guided mode: prompt card in Lora italic with purple left border and refresh button
- [ ] Context from Pray tab pre-fills a contextual prompt with dismiss option
- [ ] Free Write mode: prompt disappears, text preserved on toggle
- [ ] Auto-save draft to localStorage with accessible "Draft saved" indicator
- [ ] Date/time shown only after saving (on the saved entry, not before)
- [ ] "Save Entry" for logged-out users opens auth modal
- [ ] After saving: entry displays read-only with "Reflect on my entry" and "Write another" buttons
- [ ] "Reflect on my entry" shows inline mock AI encouragement
- [ ] Multiple entries stack on the page
- [ ] "Done journaling" shows handoff CTAs (Meditate tab, Prayer Wall)
- [ ] Crisis keyword detection on textarea
- [ ] Completion signal writes to localStorage

### Meditate Tab

- [ ] Intro text displays
- [ ] 6 cards in 2-column grid with icons, descriptions, time estimates
- [ ] Tapping a card navigates to the meditation's dedicated route (e.g., `/meditate/breathing`)
- [ ] Individual checkmarks per card when completed today (logged-in only)
- [ ] All-6-complete celebratory message with golden glow animation
- [ ] Completion tracking writes to localStorage after any single meditation completes

### Breathing Exercise

- [ ] Pre-start: "What to expect" text, duration selector (no default), voice/chime toggles, Begin button
- [ ] Exercise: expanding/contracting circle, phase labels + countdown, scripture verse, chimes, voice cues
- [ ] Wake Lock active on mobile
- [ ] "Leave exercise?" confirmation on navigation
- [ ] aria-live region for screen readers
- [ ] Completion screen with mini hub cards and CTAs

### Scripture Soaking

- [ ] Pre-start: explainer text, verse hidden until Begin, "Try another verse" shuffle, duration selector
- [ ] Timer: verse in Lora, progress bar, pause capability, chime at end
- [ ] Completion screen with mini hub cards and CTAs

### Gratitude Reflection

- [ ] 3 text fields, "+ Add another" after all 3 filled, no upper limit
- [ ] "Done" button, completion screen with count-aware affirmation + scripture + mini hub cards

### ACTS Prayer Walk

- [ ] Stepper: 4 steps, progress indicator, prompt + verse + optional notes at each step
- [ ] Next + Previous + Skip navigation
- [ ] Notes are ephemeral
- [ ] Completion screen with mini hub cards and CTAs

### Psalm Reading

- [ ] Psalm selection via scrollable card list with descriptions
- [ ] One verse at a time, "Verse X of Y" indicator, Previous + Next
- [ ] Psalm 119 sectioned into 22 parts with section selection
- [ ] Completion screen with mini hub cards and CTAs

### Examen

- [ ] Soft note about evening practice
- [ ] Stepper: 5 steps, mirrors ACTS UX
- [ ] Notes are ephemeral
- [ ] Completion screen with mini hub cards and CTAs

### Shared Pages

- [ ] `/verse/:id` renders verse with branding, Spotify embed, CTAs, OG tags
- [ ] `/prayer/:id` renders prayer with branding, Spotify embed, CTAs, OG tags
- [ ] Both pages are publicly accessible (no auth)

### Cross-Cutting

- [ ] Context passes between tabs via shared React state
- [ ] Meditation sub-pages return to `/daily?tab=meditate` with completion state
- [ ] All completion signals write to correct localStorage keys
- [ ] Crisis detection works on Pray and Journal inputs
- [ ] Read Aloud (TTS) works with karaoke highlighting
- [ ] Share dropdown works consistently across all shareable content
- [ ] All scripture uses WEB translation
- [ ] All pages responsive (mobile, tablet, desktop)
- [ ] All interactive elements keyboard-accessible with ARIA labels
- [ ] Spotify "Follow our playlist" CTA in Song Pick section and site footer
- [ ] Route redirects work: `/pray` → `/daily?tab=pray`, `/journal` → `/daily?tab=journal`, `/meditate` → `/daily?tab=meditate`

---

## Out of Scope

- Backend API integration (all data is localStorage/mock for now)
- Real AI integration (OpenAI for prayers, prompts, reflections)
- User authentication system (auth modals are present but non-functional)
- Database persistence (saved prayers, journal entries, mood tracking)
- Spotify API integration (just embed iframes with hardcoded track IDs)
- Ambient background sounds on Journal page (future enhancement)
- Points/gamification system (future spec — noted for midnight reset compatibility)
- Landing page quiz wiring to Daily features (separate spec)
- WEB translation update for landing page quiz (separate task)
- Dark mode
- Shareable scripture image cards (auto-generated branded images — future)
- Streaks and habit tracking (future spec)
- Saved/favorited content pages ("My Saved Prayers," "My Favorites" — future)
- Guided Reading Plans (future content addition to Meditate page)
- Guided Devotionals (future content addition to Meditate page)

---

## Build Order

1. **Daily Hub shell with tabs** — Hero, sticky tab bar with query param routing, tab content area, Song Pick section, Quiz section, Footer. Route redirects for `/pray`, `/journal`, `/meditate`.
2. **Pray tab content** — Move existing Pray page components into the tab. "What's On Your Heart?" heading, starter chips, textarea with glow, prayer generation, Classic Prayers, navigation cards.
3. **Journal tab content** — Move existing Journal page components into the tab. "What's On Your Mind?" heading, mode toggle, guided prompt card, textarea, save/reflect flow.
4. **Meditate tab content** — Move existing Meditate page grid into the tab. 6 cards linking to sub-page routes.
5. **Meditation sub-pages** — All 6 types with their full-screen experiences. Completion screens return to `/daily?tab=meditate`.

Each phase should be reviewed with `/code-review --spec _specs/daily-experience.md` before moving to the next.
