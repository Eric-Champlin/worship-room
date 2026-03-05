# Feature: Daily Experience (Hub + Pray + Journal + Meditate)

## Overview

The Daily Experience is the spiritual heartbeat of Worship Room — a unified system of four interconnected pages that guide users through daily spiritual practices. The **Daily Hub** (`/daily`) serves as a calm, spacious dashboard with Verse & Song of the Day as the hero, and cards linking to three practice pages: **Pray** (`/pray`), **Journal** (`/journal`), and **Meditate** (`/meditate`).

Each practice stands alone but passes context to the others, creating a fluid devotional flow. Completion tracking with checkmarks provides gentle motivation without pressure. This feature embodies the app's core mission: meeting users where they are emotionally and guiding them toward healing through scripture, prayer, reflection, and stillness.

This spec covers all four pages as one feature because they share completion tracking, context passing, auth gating patterns, shared routes, and handoff CTAs. They should be built incrementally (Hub → Meditate → Pray → Journal) but designed as a cohesive system.

## User Stories

- As a **logged-out visitor**, I want a peaceful daily landing page that shows today's verse and song and gives me clear paths to pray, journal, or meditate, so I can build a daily spiritual habit without needing an account.
- As a **logged-out visitor**, I want to access all 6 meditation types, journal with guided prompts, view classic prayers, and use Read Aloud on any content, so I can experience Worship Room's value before signing up.
- As a **logged-in user**, I want to generate a personalized AI prayer based on what I'm feeling, so I can connect with God even when I don't know what to say.
- As a **logged-in user**, I want to journal freely or with a guided prompt and save my entries, so I can process my thoughts and emotions with God and revisit them later.
- As a **logged-in user**, I want to see checkmarks when I complete a practice, so I feel a sense of accomplishment and motivation to continue.
- As a **logged-out visitor or logged-in user**, I want to share a verse or prayer with a friend via a beautiful shareable link, so I can encourage others and introduce them to Worship Room.

## Requirements

### 1. Daily Hub (`/daily`)

**Greeting Section**
- Time-aware greeting: "Good morning," / "Good afternoon," / "Good evening," based on local time (Morning: 12:00 AM-11:59 AM, Afternoon: 12:00 PM-4:59 PM, Evening: 5:00 PM-11:59 PM)
- Personalized if logged in ("Good morning, Eric!"), generic if logged out ("Good morning!")
- Subtitle always visible: "Start with any practice below."

**Verse of the Day Hero**
- Purple gradient hero section consistent with landing page hero styling
- Full verse text in Lora serif (large, white), verse reference below in Inter (e.g., "Philippians 4:6-7 WEB")
- All scripture uses WEB (World English Bible) translation — modern English, public domain, no licensing required
- Share button: share dropdown (copy link, email, SMS, Facebook, X) sharing a link to `/verse/:id`
- No Read Aloud button on the hub (reserved for individual practice pages)
- 30 curated verses rotating daily based on day-of-month, randomized across themes (peace, hope, healing, anxiety, gratitude, strength, trust, grief, joy, forgiveness)

**Song of the Day**
- Inside the hero section, below the verse
- Label: "Today's Song Pick"
- Spotify compact embed (80px height) using hardcoded track IDs from the Worship Room playlist
- 30 hardcoded Spotify track IDs rotating daily, independent of verse rotation
- "Follow our playlist on Spotify" CTA linking to the playlist URL
- No Spotify API required — embed iframe works with just track IDs

**Practice Cards Section**
- 3 cards: Pray, Journal, Meditate — identical card style with different icons and labels
- Each card: icon, label, preview text, optional green checkmark when completed today
- Cards navigate to `/pray`, `/journal`, `/meditate` on tap
- Desktop: 3 in a row. Tablet: 3 in a row (smaller). Mobile: stacked vertically

**Completion Tracking**
- localStorage-based tracking with date, pray/journal/meditate completion flags
- Resets at midnight local time when the stored date no longer matches today
- Each practice page writes directly to localStorage when user completes an activity
- Future: localStorage structure will be replaced with backend API calls; UI reads the same data shape regardless of source

**Shared Verse Page (`/verse/:id`)**
- Public page (no auth required) for sharing verses
- Purple gradient hero with verse in Lora serif, Worship Room branding
- Spotify embed below hero, "Follow our playlist" CTA
- CTAs: "Explore Worship Room" to `/`, "Start your daily time with God" to `/daily`
- Open Graph meta tags for social sharing

### 2. Pray Page (`/pray`)

**Input Section**
- Auto-expanding textarea with placeholder "What would you like to pray about?"
- 500-character limit for AI cost control
- Empty submit shows gentle nudge: "Tell God what's on your heart — even a few words is enough."
- Short/vague input accepted gracefully — generates a general prayer for clarity and peace
- "Generate Prayer" button: logged-out opens auth modal, logged-in submits for generation

**Starter Chips**
- 8 tappable chips: "I'm anxious about...", "I'm grateful for...", "I need healing for...", "I'm struggling with...", "Help me forgive...", "I need guidance about...", "I'm grieving over...", "I feel lost about..."
- Tapping fills textarea with phrase, cursor at end, other chips disappear
- Mobile: horizontally scrollable. Desktop: wrapped into rows

**Generated Prayer Display**
- Input collapses, prayer displays in Lora serif
- Structure: always starts with "Dear God," and ends with "Amen." (5-8 sentences)
- Displayed all at once (no line-by-line reveal)
- Simulated 1-2 second loading delay for mock data

**Action Buttons**
- Copy, Read Aloud (browser TTS with karaoke-style word highlighting), Save (auth-gated)
- "Journal about this" CTA passes context to `/journal` via React Router state
- Share dropdown (same pattern as Prayer Wall)
- "Pray about something else" resets the page
- Mobile: primary 3 icon buttons + "More" overflow menu

**Classic Prayers Section**
- Collapsible section (collapsed by default) with 6 curated prayers:
  1. The Lord's Prayer (Matthew 6:9-13)
  2. Serenity Prayer (Reinhold Niebuhr)
  3. Prayer of St. Francis
  4. Psalm 23
  5. Prayer for Peace (St. Patrick's Breastplate, shortened)
  6. A Prayer for Healing
- Each prayer: title, attribution, full text in a styled card with Copy, Read Aloud, Share

**Shared Prayer Page (`/prayer/:id`)**
- Public page identical to `/verse/:id` layout with prayer text, Spotify embed, CTAs, OG meta tags

**Completion Signal**
- When a prayer is generated (mock or real), write completion to localStorage

### 3. Journal Page (`/journal`)

**Date/Time Header**
- Diary-style: "Tuesday, March 3, 2026 — 8:42 AM"

**Mode Toggle**
- "Guided" | "Free Write" toggle — defaults to Guided, remembers preference in localStorage
- Switching modes preserves existing textarea text

**Guided Mode**
- Prompt card displayed above textarea from a curated list of 15-20 mock prompts covering emotional/spiritual themes
- "Try a different prompt" shuffles to a new prompt
- Context from Pray page (via React Router state) shows banner: "Continuing from your prayer about [topic]" with contextual prompt and "Write about something else" dismiss link

**Free Write Mode**
- Prompt card disappears; textarea only
- Context from other practices shows a subtle note with dismiss link

**Textarea**
- Plain text, Lora serif font, auto-expands
- 5,000-character limit
- Auto-save draft to localStorage with accessible "Draft saved" indicator (aria-live)
- Draft persists across tab closes; clears after explicit save

**Save Entry**
- Logged-out: auth modal ("Sign in to save your journal entries")
- Logged-in: entry saves, textarea becomes read-only
- After saving: "Reflect on my entry" button + "Write another" button appear
- Previous saved entries from today stack below

**Reflect on My Entry**
- Button (not automatic) — logged-out: auth modal; logged-in: mock AI encouragement inline (2-3 sentences)
- Available on every saved entry

**Done Journaling**
- Appears after at least one entry is saved
- Shows handoff CTAs: "Return to Daily" (primary), "Continue to Meditate" and "Visit the Prayer Wall" (secondary)

**Completion Signal**
- When an entry is saved, write completion to localStorage

### 4. Meditate Page (`/meditate`)

**Intro Section**
- Text: "Take a moment to slow down and be present with God. Choose how you'd like to be still today."

**Meditation Grid**
- 6 cards in a 2-column grid (desktop and mobile) with individual checkmarks:
  1. **Breathing Exercise** (2-10 min) — 4-7-8 breathing pattern with expanding/contracting circle, scripture verse, chimes, voice guidance, Wake Lock API
  2. **Scripture Soaking** (2-10 min) — single verse display with timer, progress bar, pause capability
  3. **Gratitude Reflection** (5 min) — 3+ text fields ("I'm grateful for..."), count-aware affirmation on completion
  4. **ACTS Prayer Walk** (10-15 min) — 4-step stepper (Adoration, Confession, Thanksgiving, Supplication) with prompts, scripture, ephemeral notes
  5. **Psalm Reading** (5-10 min) — 15 curated Psalms, one verse at a time, Psalm 119 sectioned into 22 parts
  6. **Examen** (10-15 min) — 5-step evening reflection stepper mirroring ACTS UX

**All-6-Complete Celebration**
- Celebratory message with golden glow animation when all 6 types completed in one day

**Completion Signal**
- Completing any one meditation type writes completion to hub localStorage
- Each individual type tracked separately in localStorage

**Breathing Exercise Details**
- Pre-start: duration selector (2/5/10 min, no default), voice guidance toggle (on by default), chime toggle (on by default), "Begin" disabled until duration selected
- During: expanding/contracting violet circle, phase labels with countdown, scripture verse below, chime at transitions, Wake Lock API on mobile
- Navigation away triggers "Leave exercise?" confirmation
- Accessibility: aria-live region for screen readers

**Scripture Soaking Details**
- Pre-start: explainer text, verse hidden until "Begin", "Try another verse" shuffle, duration selector
- During: verse in large Lora serif, progress bar, pause button, chime at completion, Wake Lock API

**ACTS and Examen Details**
- Step-by-step wizard (one step per screen), progress indicator, optional ephemeral notes per step
- Next + Previous + Skip navigation for maximum flexibility
- Notes are not saved anywhere — they exist only during the session

**Psalm Reading Details**
- Scrollable card list of 15 Psalms with descriptions
- One verse at a time with "Verse X of Y" progress indicator
- Brief intro before verse 1 with historical context
- Psalm 119 sectioned into 22 parts of 8 verses each

**Shared Completion Screen Pattern**
- All meditations, Pray, and Journal show same completion screen: "Well done!" message, mini Daily hub cards with updated checkmarks, contextual CTAs for next actions

## Acceptance Criteria

### Daily Hub
- [ ] Time-aware personalized greeting displays correctly for all 3 time periods
- [ ] Verse of the Day displays in Lora serif on purple gradient hero with WEB translation and reference
- [ ] Share button on verse opens share dropdown; shared link goes to `/verse/:id`
- [ ] Spotify compact embed plays a song from the curated playlist
- [ ] "Follow our playlist on Spotify" CTA links to the correct playlist URL
- [ ] 3 practice cards display with icons, labels, and preview text
- [ ] Checkmarks appear on cards when practices are completed today
- [ ] Checkmarks reset at midnight local time
- [ ] Cards navigate to correct practice pages on tap
- [ ] Responsive: cards stack vertically on mobile

### Pray Page
- [ ] Textarea starts at 2-3 lines and auto-expands; 500-char limit enforced
- [ ] 8 starter chips display; tapping one fills textarea and hides others
- [ ] Chips scroll horizontally on mobile, wrap on desktop
- [ ] Empty submit shows gentle nudge message
- [ ] Logged-out "Generate Prayer" opens auth modal
- [ ] Mock prayer generates with loading animation (1-2 second delay)
- [ ] Generated prayer displays in Lora serif with "Dear God...Amen" structure
- [ ] Action buttons work: Copy, Read Aloud (TTS with karaoke highlighting), Save (auth-gated), Share, "Pray about something else" (reset), "Journal about this" (context passing)
- [ ] Classic prayers section collapsible with 6 prayers, each with Copy/Read Aloud/Share
- [ ] Crisis keyword detection shows non-blocking banner with resources
- [ ] Completion signal writes to localStorage
- [ ] `/prayer/:id` shared page renders correctly with OG tags

### Journal Page
- [ ] Date/time header displays correctly
- [ ] Toggle defaults to Guided; remembers preference in localStorage
- [ ] Guided mode: prompt card above textarea with "Try a different prompt"
- [ ] Context from Pray page shows banner with contextual prompt and dismiss option
- [ ] Free Write mode: prompt disappears, text preserved on toggle switch
- [ ] Auto-save draft to localStorage with accessible "Draft saved" indicator
- [ ] "Save Entry" for logged-out users opens auth modal
- [ ] After saving: read-only entry with "Reflect on my entry" and "Write another" buttons
- [ ] "Reflect on my entry" shows inline mock AI encouragement (auth-gated)
- [ ] Multiple entries stack on the page with individual timestamps
- [ ] "Done journaling" shows handoff CTAs
- [ ] Crisis keyword detection on textarea
- [ ] Completion signal writes to localStorage

### Meditate Page
- [ ] Intro text displays; 6 cards in 2-column grid
- [ ] Individual checkmarks per card when completed today
- [ ] All-6-complete celebratory message with golden glow animation
- [ ] Hub checkmark triggers after any single meditation completes

### Breathing Exercise
- [ ] Pre-start: explanation, duration selector (no default), voice/chime toggles, Begin disabled until duration selected
- [ ] Expanding/contracting circle with phase labels + countdown
- [ ] Scripture verse displayed below circle
- [ ] Chimes and voice guidance at phase transitions (when enabled)
- [ ] Wake Lock active on mobile
- [ ] "Leave exercise?" confirmation on navigation away
- [ ] aria-live region for screen readers
- [ ] Completion screen with mini hub cards and CTAs

### Scripture Soaking
- [ ] Pre-start: explainer, verse hidden until Begin, "Try another verse" shuffle, duration selector
- [ ] Timer with progress bar, pause capability, chime at end
- [ ] Wake Lock active on mobile
- [ ] Completion screen with mini hub cards and CTAs

### Gratitude Reflection
- [ ] 3 text fields; "+ Add another" appears after all 3 filled; no upper limit
- [ ] "Done" button; completion screen with count-aware affirmation + scripture

### ACTS Prayer Walk
- [ ] 4-step stepper with progress indicator, prompt + scripture + optional notes per step
- [ ] Next + Previous + Skip navigation; notes are ephemeral
- [ ] Completion screen with mini hub cards and CTAs

### Psalm Reading
- [ ] Psalm selection via scrollable card list with descriptions
- [ ] One verse at a time, "Verse X of Y" indicator, Previous + Next navigation
- [ ] Psalm 119 sectioned into 22 parts with section selection
- [ ] Brief intro before verse 1 for each Psalm
- [ ] Completion screen with mini hub cards and CTAs

### Examen
- [ ] Soft note about evening practice tradition
- [ ] 5-step stepper mirroring ACTS UX; notes are ephemeral
- [ ] Completion screen with mini hub cards and CTAs

### Shared Pages
- [ ] `/verse/:id` renders verse with branding, Spotify embed, CTAs, OG tags
- [ ] `/prayer/:id` renders prayer with branding, Spotify embed, CTAs, OG tags
- [ ] Both pages publicly accessible (no auth)

### Cross-Cutting
- [ ] Context passes between pages via React Router state
- [ ] All completion signals write to correct localStorage keys
- [ ] Crisis detection works on Pray and Journal textareas
- [ ] Read Aloud (TTS) works with play/pause/stop and karaoke word highlighting
- [ ] Share dropdown consistent across all shareable content (verses, prayers, classic prayers)
- [ ] All scripture uses WEB translation
- [ ] All pages responsive (mobile < 640px, tablet 640-1024px, desktop > 1024px)
- [ ] All interactive elements keyboard-accessible with proper ARIA labels
- [ ] Spotify "Follow our playlist" CTA on Daily hub and site footer

## UX & Design Notes

- **Tone**: Peaceful, encouraging, gentle motivation. Every interaction should make users feel seen, supported, and hopeful. No pressure, no gamification guilt.
- **Colors**: Purple gradient hero (`#0D0620` to `#6D28D9`), neutral background (`#F5F5F5`), white cards, success green (`#27AE60`) for checkmarks, golden glow for celebration
- **Typography**: Inter for body/UI (semi-bold 600 for headings, regular 400 for body), Lora serif for all scripture and prayer text (regular 400, italic for emphasis), Caveat for decorative branding
- **Responsive**: Mobile-first. Mobile (< 640px): stacked cards, 2-col meditation grid, horizontally scrollable chips. Tablet (640-1024px): 3 cards in row, 2-col grid. Desktop (> 1024px): 3 cards in row, 2-col grid, wrapped chips
- **Animations**: Gentle fade-ins, breathing circle expand/contract with violet glow, golden glow celebration, loading spinner for prayer generation. No jarring transitions.
- **Breathing Circle**: Expands during "Breathe in" (4s), holds at full size during "Hold" (7s), contracts during "Breathe out" (8s). Soft violet glow from primary color (`#6D28D9`)

## AI Safety Considerations

- **Crisis detection needed?**: Yes — on Pray textarea and Journal textarea (not Gratitude fields, not ACTS/Examen notes)
- **User input involved?**: Yes — Pray textarea (500 chars), Journal textarea (5,000 chars), Gratitude text fields, ACTS/Examen note fields
- **AI-generated content?**: Yes (mocked for this phase) — generated prayers and journal reflections. Plain text only, no HTML/Markdown rendering. All AI-generated content displays with implicit disclaimer per `.claude/rules/01-ai-safety.md`
- **Crisis keyword detection**: Conservative, explicit language only — "suicide," "kill myself," "want to die," "end my life," "self-harm," "cutting myself," "being abused," "being hurt by." NOT vague emotional phrases like "nobody cares" or "I feel hopeless" (these are normal expressions the app is designed to support)
- **Crisis response**: Non-blocking informational banner with 988 Suicide & Crisis Lifeline (call or text 988) and Crisis Text Line (text HOME to 741741). User can continue typing and submitting. Same shared utility as Prayer Wall
- **Theological boundaries**: Generated prayers use encouraging language ("Scripture encourages us..."), never claim divine authority, avoid denominational bias per `.claude/rules/01-ai-safety.md`
- **Content moderation**: Mock prayers are pre-written and pre-reviewed. When real AI integration happens (Phase 3+), backend crisis detection (classifier + keyword fallback) will run before generation per `.claude/rules/01-ai-safety.md`

## Auth & Persistence

- **Logged-out (demo mode)**: Full access to all pages, all meditation types, guided journal prompts, classic prayers, Read Aloud, sharing, and completion tracking (via localStorage). Zero server-side persistence. No cookies, no anonymous IDs, no IP logging. Completion checkmarks are local only.
- **Logged-in**: Prayer generation, journal saving, prayer saving, and "Reflect on my entry" require authentication. When backend exists (Phase 3+): prayers save to a future `saved_prayers` table, journal entries save to `journal_entries` table (encrypted at rest), completion tracking persists to a future `daily_completions` table
- **Auth modal pattern**: Same modal component used in Prayer Wall. Triggered contextually: "Sign in to generate a prayer" / "Sign in to save your journal entries" / "Sign in to reflect on your entry"
- **Route types**: All routes public (`/daily`, `/pray`, `/journal`, `/meditate`, `/verse/:id`, `/prayer/:id`). Auth gates specific actions within pages, not page access itself.

## Mock Data Summary

All features are frontend-first with mock data. No backend or AI integration required.

| Content | Count | Notes |
|---------|-------|-------|
| Verse of the Day | 30 verses | WEB, randomized themes, day-of-month rotation |
| Song of the Day | 30 Spotify track IDs | From Worship Room playlist, independent rotation |
| Mock AI prayers | 8-10 | Topic-matched, "Dear God...Amen" structure |
| Guided journal prompts | 15-20 | Covering emotional/spiritual theme spectrum |
| Mock journal reflections | 8-10 | Warm, encouraging, 2-3 sentences |
| Breathing exercise verses | 20 | Calming/peace themes, WEB |
| Scripture soaking verses | 20 | Deeper/reflective themes, WEB, separate pool |
| Classic prayers | 6 | Full text, static content |
| Gratitude affirmations | 3-5 | Count-aware rotating messages |
| Gratitude scripture verses | 3-5 | Gratitude-themed, WEB |
| ACTS supporting verses | 4 | One per step, WEB |
| Psalms | 15 complete | Full text, WEB, with intros |
| Examen prompts | 5 | Static text |

### What's Real (Not Mocked)
- All UI, navigation, layout, and interactions
- Breathing exercise timer, circle animation, chimes, voice guidance (browser Speech Synthesis)
- Scripture soaking timer and progress bar
- Journal text editor with draft persistence (localStorage)
- Completion tracking (localStorage) with checkmark display
- Crisis keyword detection (shared utility)
- Share dropdown and share route pages
- Spotify embed (real embed, hardcoded track IDs)
- Read Aloud TTS (real browser Speech Synthesis API)
- Wake Lock API (real browser API)
- Responsive design (mobile, tablet, desktop)
- All accessibility features (aria-live, ARIA labels, keyboard navigation)
- "Leave exercise?" confirmation dialogs

## Build Order

1. **Daily Hub** — The shell. Greeting, verse hero, Spotify embed, 3 practice cards, localStorage tracking, shared verse route.
2. **Meditate** — All 6 types. No AI dependency, self-contained. Mostly UI, timers, and animations.
3. **Pray** — AI prayer generation (mocked), starter chips, classic prayers, Read Aloud with karaoke, share, shared prayer route.
4. **Journal** — Two modes, draft persistence, context from Pray, "Reflect on my entry," multiple entries, "Done journaling" CTAs.

Each phase should have its own implementation plan (via `/plan`) and code review (via `/code-review`), but all four are part of this single spec.

## Out of Scope

- Backend API integration (all data is localStorage/mock for now)
- Real AI integration (OpenAI for prayers, prompts, reflections — Phase 3+)
- User authentication system (auth modals are present but non-functional)
- Database persistence (saved prayers, journal entries, mood tracking)
- Spotify API integration (just embed iframes with hardcoded track IDs)
- Ambient background sounds on Journal page (future enhancement)
- Points/gamification system (future spec — noted for midnight reset compatibility)
- Landing page quiz wiring to Daily features (separate spec)
- WEB translation update for landing page quiz (separate task)
- Dark mode
- Shareable scripture image cards (auto-generated branded images)
- Streaks and habit tracking
- Saved/favorited content pages ("My Saved Prayers," "My Favorites")
- Guided Reading Plans (future content addition to Meditate page)
- Guided Devotionals (future content addition to Meditate page)
- Multi-language support (English only for MVP)
- Payments/subscriptions (free for MVP)
- Mobile native apps (web-responsive only for MVP)
