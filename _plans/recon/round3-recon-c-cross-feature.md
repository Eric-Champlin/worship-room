Perfect. Now I have enough information to generate the comprehensive report. Let me create the markdown document:

# Cross-Feature Touch Points Recon — Worship Room Frontend

This is a comprehensive recon of data exposure, event tracking, component rendering, and integration surfaces across all features in the Worship Room frontend codebase. This report drives Round 3 Prayer Wall and Profile spec design.

## 1. Daily Hub (`/daily` — Devotional, Pray, Journal, Meditate tabs + 6 meditation sub-pages)

### Data Exposed

**Public data available to other features:**
- Devotional titles, passages, reflection questions, saint quotes via `/data/devotionals.ts` (50 devotionals, 30 general + 20 seasonal)
- Journal entries persisted in `wr_journal_draft` (localStorage, single draft per session)
- Prayer draft in `wr_prayer_draft` (localStorage)
- Meditation completion flags in `wr_daily_completion` (localStorage, keys: `meditation_breathing`, `meditation_soaking`, `meditation_gratitude`, `meditation_acts`, `meditation_psalms`, `meditation_examen`)
- Devotional reads tracking in `wr_devotional_reads` (array of date strings, e.g., `["2026-04-14"]`)
- Journal mode preference in `wr_journal_mode` (string: `"guided"` or `"freewrite"`)

**Cross-feature data consumption:**
- `PrayContext` object passed via component state between tabs (contains `from`, `topic`, `customPrompt`, optional `devotionalSnapshot`)
- Verse context passed via URL query params from devotional → meditate: `?verseRef=`, `?verseText=`, `?verseTheme=`
- `DevotionalSnapshot` type (passage, reflection body, question, quote) persisted in `prayContext` for 3-way context passing (devotional → journal/pray)

### Events Emitted / Recorded

**Completion tracking (Daily Hub level):**
- `isPrayComplete` — fires when Pray tab textarea is saved via `markPrayComplete()`
- `isJournalComplete` — fires when Journal entry is saved via `markJournalEntry()`
- `isMeditateComplete` — fires when a meditation sub-page marks completion via `markMeditationComplete(type)`
- `hasReadDevotional` — tracked in `wr_devotional_reads` localStorage key (date-based)

**Faith points recording via `useFaithPoints().recordActivity()`:**
- `pray` — 10 pts (recorded when user saves a prayer on Pray tab)
- `journal` — 25 pts (recorded when user saves a journal entry)
- `meditate` — 20 pts (recorded when user completes a meditation)
- `devotional` — implicitly tracked but not explicitly recorded as activity (read via `wr_devotional_reads`)

**Badges triggered by Daily Hub:**
- Bible-related badges (via echoes, streaks, reading heatmap) — async, not in Daily Hub directly
- Meditation badges (Breathing Exercise, Soaking, etc.) — triggered at `/meditate/*` sub-pages

**Crisis keyword detection:**
- `CrisisBanner` mounts on Pray and Journal tabs if text contains crisis keywords
- `CRISIS_RESOURCES` constant exposed with hotline numbers, no cross-feature persistence

### Components Rendering Elsewhere

**Daily Hub content visible in:**
- **Dashboard:** `QuickActions` card links directly to `/daily?tab=pray|journal|meditate`
- **Dashboard:** `ActivityChecklist` shows completion status for all 4 Daily Hub activities (devotional, pray, journal, meditate) with checkmarks
- **Dashboard:** `GrowthGarden` SVG grows in stages as completion activities accumulate (including Daily Hub activities)
- **Navbar:** "Daily Hub" link always visible; logged-in avatar dropdown includes "Daily Hub" jump link
- **Prayer Wall:** Inline composers reference Daily Hub Pray tab for draft persistence behavior
- **Bible Reader:** "Meditate on this passage" white pill CTA navigates to `/daily?tab=meditate&verseRef=...&verseText=...&verseTheme=...` (Spec Z verse-aware meditation)

**Meditation sub-pages (`/meditate/breathing`, `/meditate/soaking`, etc.) rendering:**
- 6 sub-pages: Breathing, Soaking, Gratitude, ACTS, Psalms, Examen
- Each has its own route-level auth gate and URL param consumption
- ScriptureSoaking sub-page consumes `?verse=`, `?verseText=`, `?verseTheme=` from devotional context (Spec Z)
- BreathingExercise sub-page consumes the same params and displays the devotional verse during breathing pattern
- Each sub-page records completion via `markMeditationComplete(type)` which feeds into `wr_daily_completion` and `recordActivity('meditate')`

### Incoming CTAs

**Links/buttons in OTHER features pointing INTO Daily Hub:**
- Dashboard `QuickActions` card: 4 white pill buttons → `/daily?tab=pray|journal|meditate|devotional`
- Navbar: "Daily Hub" top-level nav link → `/daily` (defaults to devotional tab)
- Avatar dropdown: "Daily Hub" link → `/daily`
- Homepage (Home.tsx): "Pray" CTA in hero → `/daily?tab=pray`
- Homepage (Home.tsx): JourneySection cards (7-step timeline) link to `/daily?tab=...`
- StartingPointQuiz result cards: "Prayer" result → `/daily?tab=pray` (and similar for journal, meditate)
- Prayer Wall inline composer: "Try journaling" CTA → `/daily?tab=journal` with context
- Bible Reader: "Meditate on this passage" CTA → `/daily?tab=meditate&verseRef=...&verseText=...&verseTheme=...`
- Challenges: Challenge day action CTAs may link to `/daily?tab=pray` for action type "pray"

### localStorage Keys Owned

- `wr_devotional_reads` — JSON array of date strings (format: `YYYY-MM-DD`) marking which days the devotional was read
- `wr_prayer_draft` — JSON string containing the unsaved prayer textarea content (auto-save with 1s debounce)
- `wr_journal_draft` — JSON string containing the unsaved journal entry textarea content (auto-save with 1s debounce)
- `wr_journal_mode` — string: `"guided"` or `"freewrite"` (persisted mode toggle preference)
- `wr_daily_completion` — JSON object with keys: `meditation_breathing`, `meditation_soaking`, `meditation_gratitude`, `meditation_acts`, `meditation_psalms`, `meditation_examen` (boolean flags, date-reset)
- `wr_meditation_history` — JSON array of completion records (non-core, optional analytics)

### Mock Data Dependencies

- `daily-experience-mock-data.ts`:
  - 30 daily verses (WEB translation)
  - 30 songs (Spotify integration)
  - 9 mock prayers
  - Journal prompts (Guided mode)
  - Reflections and gratitude affirmations
  - ACTS steps, examen steps, breathing verses, soaking verses
- `daily-experience-psalms.ts`:
  - 10 full Psalms with verses, intros, historical context
- `devotionals.ts`:
  - 50 devotionals (30 general + 20 seasonal) with passage, reflection, question, saint quote

### Test Coverage

- **Page-level tests:** 1 core test file (`DailyHub.test.tsx` ~ 400 lines)
- **Tab-level tests:** 4 comprehensive tab content test files (~150-300 lines each):
  - `DevotionalTabContent.test.tsx` (tests devotional rendering, cross-tab CTAs, context passing)
  - `PrayTabContent.test.tsx` (tests prayer generation, crisis detection, draft persistence)
  - `JournalTabContent.test.tsx` (tests guided/freewrite modes, draft persistence, DevotionalPreviewPanel)
  - `MeditateTabContent.test.tsx` (tests meditation card rendering, verse context, sub-page navigation)
- **Component tests:** 10 additional component-level tests
  - `DailyAmbientPillFAB.test.tsx` (FAB visibility, drawer interaction)
  - `AmbientSoundPill.test.tsx` (audio drawer triggering)
  - `GuidedPrayerSection.test.tsx` (guided prayer card grid, accessibility)
  - `JournalMilestones.test.tsx` (milestone celebrations, entry count)
  - `JournalSearchFilter.test.tsx` (entry filtering, search)
  - `DevotionalEcho.test.tsx` (echo card rendering)
  - Others covering micro-interactions
- **Test architecture:** Mocked `useFaithPoints()`, mocked localStorage, mocked sound effects
- **Missing coverage:** Spec X DevotionalPreviewPanel collision detection (draft overwrite dialogs) has basic coverage but edge cases untested

---

## 2. Bible (`/bible` — landing, reader, plans, search, highlights, memorization, notes, heatmap, AI Explain/Reflect, journal entries)

### Data Exposed

**Public data available to other features:**
- 66 books with chapter counts via `BIBLE_BOOKS` constant (Lazy-loaded JSON files via `BOOK_LOADERS` dynamic imports)
- Verse-of-the-Day (VOTD) via `/constants/verse-of-the-day.ts` (60 verses, 40 general + 20 seasonal)
- Highlights (color-coded) persisted in `highlightStore` (BB-7) and readable via `getHighlightsForChapter(book, chapter)`
- Bookmarks persisted in `bookmarkStore` (BB-7) and readable via `getBookmarksForChapter(book, chapter)`
- Notes (range-based, 10K char limit) persisted in `noteStore` (BB-8) and readable via `getNotesForChapter(book, chapter)`
- Journal entries (Bible-linked) persisted in `journalStore` (BB-11b) and readable via `getAllJournalEntries()`
- Reading heatmap data (chapter visit tracking) via `chapterVisitStore` (BB-43) — JSON array of `{ book, chapter, date }` objects
- Bible progress map (book read/partial/unread status) computed from chapter visits
- Memorization cards persisted in `useMemorizationStore()` (BB-45) — flip-card deck with `startVerse`/`endVerse`, text, review count
- Echo selections computed by `lib/echoes/` (BB-46) — pure TS, reads from history and returns ranked verse candidates
- Reading plan progress tracked in `plansStore` (BB-21) — current day, completed days, reading plan ID
- Streak data in `useStreakStore()` (BB-17) — current streak, longest streak, milestone thresholds
- AI cache for Explain/Reflect in `bb32-v1:explain:*` and `bb32-v1:reflect:*` (BB-32) — 7-day TTL, 2 MB cap

**Cross-feature data consumption:**
- `BibleDrawerProvider` context exposes `useDrawerOpen()` for accessing reader state
- Bible Reader can be deep-linked via `/bible/<book>/<chapter>?verse=<n>` (BB-38 contract)
- Chapter selector exposes `useBibleChapter()` hook for route params
- Search results linkable via `/bible/<book>/<chapter>?q=<query>` deep links

### Events Emitted / Recorded

**Completion/activity tracking:**
- Chapter visits recorded to `chapterVisitStore` on mount (fires `recordChapterVisit(book, chapter)` which increments count for heatmap)
- Verse memorization cards tracked in `useMemorizationStore()` with `reviewCount` and `lastReviewedAt`
- Highlight/bookmark/note creation fires no explicit event; persists to their respective stores (BB-7/BB-8 pattern)

**Faith points recording:**
- NOT recorded directly by Bible features — Bible is intentionally auth-free
- Phase 3 will introduce optional optional sync for logged-in users

**Badges:**
- No Bible-specific badges currently (badge system is dashboard-only)
- Streaks and milestones show in the BibleReader UI but don't trigger celebration overlays

**Push notifications (BB-41):**
- Daily verse notification (system-level push) — user receives daily Bible verse at configured time
- Streak reminder notification (system-level push) — "Still time to read a verse today if you'd like" (anti-pressure tone)
- Both independent of Prayer Wall and Daily Hub events

### Components Rendering Elsewhere

**Bible content visible in:**
- **Dashboard:** VOTD (Verse of the Day) widget — displays today's verse from `/constants/verse-of-the-day.ts`, tappable → `/bible/<book>/<chapter>?verse=<n>`
- **Dashboard:** Bible progress map miniature (if implemented) could show read status
- **Daily Hub Devotional:** Devotional passage shown in Tier 2 scripture callout (custom devotional text, not a live Bible link)
- **Daily Hub Meditation sub-pages:** Soaking verses and breathing verses are devotional-specific passages (not live Bible links)
- **Prayer Wall:** No direct Bible rendering
- **Echo card (BB-46):** Mounted on Dashboard and Daily Hub Devotional tab — displays a verse from user's past engagement (highlights, memorization, reading activity), tappable → `/bible/<book>/<chapter>?verse=<n>`

**MyBible page (`/bible/my`) mounting all personal-layer Bible data:**
- Reading heatmap (BB-43) — 365-day contribution grid
- Bible progress map (BB-43) — all 66 books with read/partial/unread cells
- Memorization deck (BB-45) — flip-card grid
- Activity feed (unified) — chronological list of highlights, notes, bookmarks, journal entries

### Incoming CTAs

**Links/buttons in OTHER features pointing INTO Bible:**
- Navbar: "Bible" top-level nav link → `/bible`
- Avatar dropdown: "My Bible" link → `/bible/my`
- Homepage: "Daily Verse" card → `/bible/john/3?verse=16` (BB-38 deep link)
- Homepage: JourneySection card (step 2) → `/bible` (read a verse)
- StartingPointQuiz result (if Bible-related) → redirects to other feature (no direct Bible result)
- Dashboard VOTD widget: verse text → `/bible/<book>/<chapter>?verse=<n>` (BB-38)
- Echo cards (Dashboard & Daily Hub): "30 days ago you highlighted this" → `/bible/<book>/<chapter>?verse=<n>` (BB-38)
- Daily Hub Devotional: "Meditate on this passage" → `/daily?tab=meditate&verseRef=...&verseText=...&verseTheme=...` (then Scripture Soaking or Breathing can navigate to BibleReader)
- Prayer Wall: No direct Bible links
- Challenges: Challenge reflection questions sometimes include Bible references (text-based, not linked)
- Reading Plans: Plan days include Bible passages with navigation via `/bible/<book>/<chapter>`

### localStorage Keys Owned

- `wr_bible_highlights` — JSON serialized highlights store (BB-7)
- `wr_bookmarks_<book>` — per-book bookmark storage (BB-7)
- `wr_bible_notes` — JSON serialized notes store with range-based data (BB-8)
- `wr_bible_progress` — JSON serialized reading progress map (BB-43)
- `wr_chapters_visited` — JSON array of chapter visit records for heatmap (BB-43)
- `wr_memorization_cards` — JSON serialized memorization card deck (BB-45)
- `wr_echo_dismissals` — JSON array of dismissed echo IDs (BB-46)
- `wr_bible_streak` — JSON object with `{ currentStreak, longestStreak, milestones }` (BB-17)
- `wr_bible_reader_theme` — string: `"midnight"` | `"parchment"` | `"sepia"` (reader-only theming)
- `wr_bible_reader_type_size` — string: `"s"` | `"m"` | `"l"` | `"xl"`
- `wr_bible_reader_line_height` — string: `"compact"` | `"normal"` | `"relaxed"`
- `wr_bible_reader_font_family` — string: `"serif"` | `"sans"`
- `wr_bible_focus_enabled` — boolean string: `"true"` | `"false"` (focus mode toggle)
- `wr_bible_focus_delay` — number: 3000 | 6000 | 12000 (ms before chrome dims)
- `wr_bible_last_read` — JSON object with `{ book, chapter, timestamp }` (resume reading card)
- `wr_bible_active_plans` — JSON array of active reading plan IDs
- `wr_bible_books_tab` — string: `"ot"` | `"nt"` (tab state on BibleBrowser)
- `wr_bible_drawer_stack` — JSON serialized drawer panel stack (for multi-panel navigation)
- `wr_bible_reader_ambient_autostart` — boolean (auto-play ambient sound on BibleReader open)
- `wr_bible_reader_ambient_autostart_sound` — string (which sound to auto-play)
- `wr_bible_reader_ambient_visible` — boolean (drawer visibility state)
- `wr_bible_reader_ambient_volume` — number 0-1 (ambient master volume in reader)
- `bb32-v1:explain:*` — AI cache namespace for Explain panel results (7-day TTL)
- `bb32-v1:reflect:*` — AI cache namespace for Reflect panel results (7-day TTL)
- `wr_bible_progress` — reading plan progress state (structured by plan ID)
- `wr_reading_plan_progress` — JSON object tracking all active and paused reading plans
- `wr_notification_prompt_dismissed` — timestamp or boolean (BB-41 notification permission prompt state)
- `wr_push_subscription` — JSON serialized Web Push API subscription object (BB-41)

### Mock Data Dependencies

- `daily-experience-mock-data.ts`:
  - 30 daily verses (WEB translation, pre-loaded for VOTD)
- `verse-of-the-day.ts` constant:
  - 60 hardcoded verses (40 general, 20 seasonal)
- `daily-experience-psalms.ts`:
  - 10 Psalms with full text (used by meditation features, not core Bible mocking)
- Live Bible data:
  - 66 JSON files in `/data/bible/books/` — loaded dynamically via Vite dynamic import

### Test Coverage

- **Page-level tests:** 6 major test files:
  - `BibleReader.test.tsx` (~400 lines — verse interaction, highlights, notes, bookmarks)
  - `BibleLanding.test.tsx` (~350 lines — landing state, today's plan, quick actions)
  - `BibleBrowse.test.tsx` (~250 lines — book browser, chapter list)
  - `MyBiblePage.test.tsx` (TBD — heatmap, progress map, memorization deck, activity feed integration)
- **Feature-level tests:** 10+ test files:
  - `BibleReaderHighlights.test.tsx` (highlight color application, persistence)
  - `BibleReaderNotes.test.tsx` (note composer, range selection, storage)
  - `BiblePlanDay.test.tsx` (plan day rendering, action buttons)
  - `BiblePlanDetail.test.tsx` (plan overview, progress, switching)
  - `ReadingHeatmap.test.tsx` (heatmap grid, cell coloring, tooltips)
  - `MemorizationDeck.test.tsx` (flip cards, add/remove, deck state)
  - `EchoCard.test.tsx` (echo selection, dismissal, deep linking)
  - `BibleReader.deeplink.test.tsx` (BB-38 URL param handling)
  - `BibleReader.seo.test.tsx` (SEO metadata per chapter)
- **Store tests:** 5 reactive store tests:
  - `useStreakStore.test.tsx` (streak calculation, milestone detection)
  - `useMemorizationStore.test.tsx` (card CRUD, deck state)
  - `highlightStore.test.ts` (highlight color tracking)
  - `bookmarkStore.test.ts` (bookmark toggle, per-chapter state)
  - `noteStore.test.ts` (note range handling, update/delete)
- **AI feature tests:** 2 test files:
  - `ExplainPanel.test.tsx` (Gemini cache, loading/error states)
  - `ReflectPanel.test.tsx` (Gemini cache, UX flow)
- **Total coverage:** 25+ test files, 5000+ lines of test code

---

## 3. Grow (`/grow` — Reading Plans and Challenges tabs)

### Data Exposed

**Reading Plans data:**
- 10 pre-built reading plans via `READING_PLAN_METADATA` from `/data/reading-plans/`
- Custom plans created by users stored in `wr_custom_plans` (localStorage)
- Active plan tracking in `wr_bible_active_plans` and `wr_reading_plan_progress`
- Daily plan content (passages, reflections, actions) accessible via plan ID + day number
- Plan completion status tracked per user (day 1-N completion array)

**Challenges data:**
- 5 community challenges via `CHALLENGES` constant from `/data/challenges.ts`
- Challenge metadata: title, theme color, start date, end date, 110 total days across all challenges
- Challenge daily content: scripture passage, reflection, action items (pray, journal, meditate, music, local support)
- Challenge progress stored in `wr_challenge_progress` (current active challenge, completed days, pause state)
- Challenge reminders in `wr_challenge_reminders` (per-challenge boolean flags)
- Challenge participant count (mock) via `getParticipantCount()` function

**Cross-feature data consumption:**
- Active challenge info queried by Prayer Wall, Dashboard, and other features via `getActiveChallengeInfo()`
- Challenge theme color used to tint navbar pulse indicator, challenge filter pill, dashboard widget
- Challenge action types (`ACTION_TYPE_LABELS`, `ACTION_TYPE_ROUTES`) map to feature deep links:
  - `pray` → `/daily?tab=pray`
  - `journal` → `/daily?tab=journal`
  - `meditate` → `/daily?tab=meditate`
  - `music` → `/music`
  - `prayerWall` → `/prayer-wall`
  - `bible` → `/bible/<book>/<chapter>`
  - `localSupport` → `/local-support/churches`

### Events Emitted / Recorded

**Completion tracking:**
- Challenge day marked complete via `completeDay(challengeId, dayNumber)` hook
- Auto-detection enabled: if user already did the action (e.g., saved a prayer), the day auto-completes via `useChallengeAutoDetect()` hook (checks `getActiveChallenge()`, calls `completeDay()`)

**Faith points recording:**
- `recordActivity('challenge')` fires when a challenge day is marked complete (12 pts per day per activity-points.ts)
- Multi-activity days (e.g., pray + journal) fire once per day, not per action

**Badges:**
- Challenge completion badges: "Challenge Conqueror", "Scripture Deep Dive", etc. (triggered by `completeDay()` reaching day thresholds)
- Milestone badges: "7-Day Champion", "30-Day Warrior" (triggered at 7, 15, 30, challenge-length day marks)
- Celebration overlay fires on challenge completion with points/badge/confetti

**Notifications:**
- Challenge reminders (BB-41): "Don't forget today's challenge action" (1x per day, configurable time)
- Configurable per-challenge via `toggleReminder(challengeId)` → persists to `wr_challenge_reminders`

### Components Rendering Elsewhere

**Grow/Challenges data visible in:**
- **Dashboard:** ChallengeWidget card shows active challenge progress (current day N/total), theme color pulse indicator
- **Navbar:** Active challenge pulse indicator (small colored dot on "Grow" nav link if a challenge is active)
- **Prayer Wall:** Active challenge filter pill above prayer feed (if `isChallengeFilterActive`, filters prayers by `challengeId`)
- **Grow page:** Tab bar shows Challenges tab with active challenge pulse indicator (same colored dot)
- **GrowPage:** Challenge tab UI surfaces active/upcoming/past challenges in three sections

**Reading plan data visible in:**
- **Bible Landing:** "Today's Plan" card shows active plan current day + passage + progress
- **Bible Landing:** "Browse all plans" link → Grow Reading Plans tab
- **Dashboard:** (future) ReadingPlanWidget could surface active plan (not currently mounted)

### Incoming CTAs

**Links/buttons in OTHER features pointing INTO Grow:**
- Navbar: "Grow" top-level nav link → `/grow` (defaults to `?tab=plans`)
- Avatar dropdown: (No direct "Grow" link; users navigate via Navbar)
- Dashboard: Quick actions do NOT link to Grow (Grow is a discovery feature, not daily practice)
- Homepage: JourneySection card (step 4: "Grow in Faith") → `/grow`
- StartingPointQuiz: (No Grow-specific result, but quiz links to homepage which links to `/grow`)
- Prayer Wall: Challenge-filter toggle appears inline (no CTA, context-aware UI)
- Bible Landing: "Browse all plans" link → `/grow?tab=plans`
- Challenge day action CTAs (inline): "Pray about this" → `/daily?tab=pray` (goes to Daily Hub, not Grow)

### localStorage Keys Owned

- `wr_challenge_progress` — JSON object with current active challenge ID, current day, completed days array, pause state
- `wr_challenge_reminders` — JSON object mapping challenge IDs to boolean reminder flags
- `wr_reading_plan_progress` — JSON object mapping plan IDs to `{ currentDay, completedDays: [...] }`
- `wr_bible_active_plans` — JSON array of currently active plan IDs (max 1 active at a time, can be paused)
- `wr_custom_plans` — JSON array of user-created reading plans (Phase 3)
- `wr_challenge_nudge_shown` — boolean (prevents duplicate nudge prompts for inactive challenges)
- `wr_anniversary_milestones_shown` — JSON object tracking which challenge milestone celebrations have fired

### Mock Data Dependencies

- `/data/challenges.ts` — 5 challenge definitions with 110 total daily content entries (scripture, reflection, action)
- `/data/reading-plans/` — 10 individual reading plan files (119 total days across all plans)
  - Each plan has `id`, `title`, `difficulty`, `duration`, daily content array
- `daily-experience-mock-data.ts` — mock prayers, journal prompts (reused by challenge day actions)

### Test Coverage

- **Page-level tests:** 2 major test files:
  - `Challenges.test.tsx` (~350 lines — challenge listing, filtering, switching, joining)
  - `ChallengeDetail.test.tsx` (~400 lines — day rendering, completion, milestones, auto-detection)
- **Feature-level tests:** 5+ test files:
  - `ChallengeProgress.test.tsx` (hook logic, day marking, streak detection)
  - `ChallengeAutoDetect.test.tsx` (auto-complete logic, activity detection)
  - `ChallengeWidget.test.tsx` (dashboard integration, progress ring)
  - `ReadingPlans.test.tsx` (plan listing, switching, progress)
  - `ReadingPlanDetail.test.tsx` (day-by-day rendering, completion)
  - `ChallengeIntegration.test.tsx` (Prayer Wall filter integration)
- **Total coverage:** 10+ test files, 2000+ lines

---

## 4. Music (`/music` — playlists, ambient, sleep, routines, AudioProvider, AudioDrawer)

### Data Exposed

**Audio data available to other features:**
- Ambient sounds catalog (24 sounds) via `SOUND_BY_ID` map from `/data/sound-catalog.ts`
- Scene presets (11 scenes) via `SCENE_BY_ID` map from `/data/scenes.ts`
- Sleep/bedtime story catalog (12 stories) via `/data/bedtime-stories.ts`
- Worship playlists (8 playlists, 4 worship + 4 explore) via `PLAYLISTS` from `/data/music/playlists.ts`
- Routines templates (4 bedtime routines) via `ROUTINES` from `/data/music/routines.ts`
- Audio playback state: `isPlaying`, `masterVolume`, `activeSounds`, `currentSceneName` via `AudioStateContext`
- Shared mix encoding/decoding: `storageService.encodeSharedMix()`, `decodeSharedMix()` for `/music?mix=...` deep links
- Sleep timer state: `wr_sleep_timer` (duration, active flag)
- Listening history: `wr_listening_history` (optional, tracks which sounds/scenes user opened)

**Cross-feature data consumption:**
- `useAudioState()` hook exposes global audio state to any component
- `useAudioDispatch()` hook allows any component to dispatch audio actions (`ADD_SOUND`, `REMOVE_SOUND`, `OPEN_DRAWER`, `CLOSE_DRAWER`)
- `useAudioEngine()` hook provides low-level Web Audio API access (advanced)

### Events Emitted / Recorded

**Completion/activity tracking:**
- `recordActivity('listen')` fires when user plays ANY audio (ambient, sleep, routine) — 10 pts per trigger
- Listening history stored in `wr_listening_history` (optional, not tied to faith points)

**Audio state changes:**
- Ambient sound add/remove dispatches `ADD_SOUND` / `REMOVE_SOUND` (triggers crossfade)
- Scene playback triggers scene-wide ambient layering
- Sleep timer countdown triggers `SLEEP_TIMER_START` / `SLEEP_TIMER_TICK` / `SLEEP_TIMER_END` actions

**Badges:**
- "Ambient Advocate" badge (triggered when user adds 5+ ambient sounds)
- Sleep routine badges (triggered by completing 3+ sleep routines)

**Push notifications (BB-41):**
- Sleep reminder notification (system-level push) — "Wind down time?" at user-configured bedtime

### Components Rendering Elsewhere

**Music data visible in:**
- **Daily Hub:** `DailyAmbientPillFAB` (sticky bottom-right FAB) — entry point to AudioDrawer, visible on all Daily Hub tabs
- **Daily Hub:** `SongPickSection` — Spotify iframe showing "Today's Song Pick" (NOT from Music feature, separate daily content)
- **Daily Hub Meditation:** Meditation sub-pages may auto-play ambient sounds (`wr_bible_reader_ambient_autostart`)
- **Bible Reader:** AudioDrawer accessible from bottom toolbar (separate from Daily Hub FAB)
- **Dashboard:** (future) Music listening widget could show recent sounds/scenes
- **AudioProvider context:** Wraps entire app, making audio controls globally accessible

### Incoming CTAs

**Links/buttons in OTHER features pointing INTO Music:**
- Navbar: "Music" top-level nav link → `/music` (defaults to ambient tab)
- Avatar dropdown: (No direct "Music" link)
- Homepage: JourneySection card (step 5: "Music") → `/music`
- StartingPointQuiz result: "Worship Music" result → `/music` or "Sleep & Rest" result → `/music?tab=sleep`
- Daily Hub Meditation: Ambient pill FAB opens AudioDrawer (right-side flyout) for ambient/scene selection
- Daily Hub tabs: Each tab computes `getAmbientContextForTab()` to set recommended ambient sounds
- Prayer tab starter chips: (No direct Music links, but AudioDrawer available via FAB)
- Challenge day action "music": `/music` deep link

### localStorage Keys Owned

- `wr_listening_history` — JSON array of `{ soundId, sceneId, timestamp, duration }` records
- `wr_saved_mixes` — JSON array of user-created custom sound mixes (shareable via encoded URL)
- `wr_sleep_timer` — JSON object `{ active: boolean, duration: number, startTime: timestamp }`
- `wr_routines` — JSON object mapping routine IDs to `{ completedDates: [...], pausedFlag: boolean }`
- `wr_bible_reader_ambient_autostart` — boolean (auto-play ambient on Bible Reader open)
- `wr_bible_reader_ambient_autostart_sound` — string (which sound ID to auto-play)
- `wr_bible_reader_ambient_visible` — boolean (drawer visibility state on Bible Reader)
- `wr_bible_reader_ambient_volume` — number 0-1 (master volume for ambient sounds)

### Mock Data Dependencies

- `/data/sound-catalog.ts` — 24 ambient sounds with metadata (name, filename, category, description)
- `/data/scenes.ts` — 11 scene presets with sound layer combinations
- `/data/bedtime-stories.ts` — 12 bedtime story entries (MP3 placeholders, TTS in Phase 3)
- `/data/music/playlists.ts` — 8 Spotify playlists (external links)
- `/data/music/routines.ts` — 4 bedtime routine templates
- `daily-experience-mock-data.ts`:
  - 30 "Song Pick" entries (Spotify track embeddings)

### Test Coverage

- **Page-level tests:** 1 major test file:
  - `MusicPage.test.tsx` (~300 lines — tab switching, audio state, shared mix handling)
- **Audio system tests:** 8+ test files:
  - `AudioProvider.test.tsx` (state management, dispatch logic, context)
  - `AudioDrawer.test.tsx` (drawer open/close, tab switching, sound controls)
  - `AudioEngine.test.tsx` (Web Audio API mocking, crossfade, volume)
  - `AmbientBrowser.test.tsx` (sound grid, add/remove, category filter)
  - `SleepBrowse.test.tsx` (bedtime story listing, playback)
  - `RoutineStepper.test.tsx` (routine flow, timer, completion)
- **Integration tests:** 2+ test files:
  - `Music-DailyHub.test.tsx` (FAB visibility, context-aware suggestions)
  - `Music-BibleReader.test.tsx` (ambient autostart, drawer integration)
- **Total coverage:** 10+ test files, 1500+ lines

---

## 5. Local Support (churches, counselors, celebrate recovery)

### Data Exposed

**Location/Support data:**
- Churches list via mock data from `/mocks/local-support-mock-data.ts` (Columbia, TN area)
- Christian counselors list (mock)
- Celebrate Recovery meetings list (mock)
- Location search: supports zipcode, city, "near me" (geo distance calculation via `calculateDistanceMiles()`)
- Listing details: address, phone, website, hours, distance (miles from user location)

**Cross-feature data consumption:**
- Challenge action type "localSupport" routes to `/local-support/churches`
- Daily Hub challenges may link to local support resources
- Prayer Wall crisis detection may suggest local support resources in non-critical moments

### Events Emitted / Recorded

**Activity tracking:**
- `recordActivity('localVisit')` fires when user visits a local support listing (5 pts)
- Local visit history stored in `wr_local_visits` (date-based tracking)

**Badges:**
- "Community Connector" badge (triggered by visiting 3+ local support locations)

### Components Rendering Elsewhere

**Local Support data visible in:**
- **Navbar:** "Local Support" dropdown (clickable label links to `/local-support/churches`, dropdown expands on hover/click)
  - Dropdown options: Churches, Counselors, Celebrate Recovery
- **HomePage:** JourneySection card (step 6) → `/local-support/churches`
- **StartingPointQuiz result:** "Local Support" result → `/local-support/churches`
- **Crisis detection:** If crisis keywords detected in Prayer/Journal, non-blocking suggestion to explore local support

### Incoming CTAs

**Links/buttons in OTHER features pointing INTO Local Support:**
- Navbar dropdown: 3 links → `/local-support/churches|counselors|celebrate-recovery`
- Homepage JourneySection: "Local Support" card → `/local-support/churches`
- StartingPointQuiz: "Local Support" result card → `/local-support/churches`
- Crisis banner (Prayer/Journal): Optional "Find local support" link → `/local-support/churches`
- Challenge day action "localSupport": `/local-support/churches` deep link

### localStorage Keys Owned

- `wr_local_visits` — JSON object mapping date strings to arrays of `{ locationType, listingId, latitude, longitude }` records
- `wr_location_last_search` — JSON object storing `{ latitude, longitude, zipcode, lastSearchTime }`

### Mock Data Dependencies

- `/mocks/local-support-mock-data.ts` — churches, counselors, celebrate recovery meetings (Columbia, TN area)

### Test Coverage

- **Page-level tests:** 1 test file:
  - `Churches.test.tsx` (~150 lines — listing, filtering, distance, map/list views)
- **Feature-level tests:** 2+ test files:
  - `Counselors.test.tsx` (~150 lines)
  - `CelebrateRecovery.test.tsx` (~150 lines)
- **Total coverage:** 3 test files, 450+ lines

---

## 6. Prayer Wall (public feed, comments, reactions, sharing, question-of-the-day)

### Data Exposed

**Prayer data available to other features:**
- Prayer request feed (mock, 18+ prayers per page) from `getMockPrayers()` in mock data
- Prayer reactions: "Praying for you" count, bookmark count per prayer
- Prayer comments (inline) showing community responses
- Prayer metadata: author (anonymous or username), category, timestamp, answered status, faith points contribution
- Question of the Day (QOTD) current question from `getTodaysQuestion()` constant
- QOTD responses filtered by `todaysQuestion.id`

**Cross-feature data consumption:**
- Active challenge filter: if a challenge is active, Prayer Wall filters prayers by `challengeId`
- Category filter: user can select one of 8 prayer categories (`PRAYER_CATEGORIES` constant)
- Challenge theme color used to tint challenge filter pill

### Events Emitted / Recorded

**Completion/activity tracking:**
- `recordActivity('prayerWall')` fires when user posts a prayer (15 pts) or comments (5 pts)
- Prayer request bookmark fires `recordActivity('prayerWall')` (15 pts)
- "Praying for you" reaction fires `recordActivity('prayerWall')` (5 pts)

**Badges:**
- "Prayer Warrior" badge (posted 3+ prayers)
- "Community Champion" badge (5+ comments/reactions)
- "Answered Prayer" badge (marked a prayer as answered)

**Notifications:**
- Comments on user's prayer (in-app bell + optional push)
- Reactions to user's prayer (batched, in-app bell only)

### Components Rendering Elsewhere

**Prayer Wall data visible in:**
- **Dashboard:** (future) Prayer feed widget could show recent community prayers
- **Navbar:** Prayer Wall top-level nav link always visible
- **Avatar dropdown:** (No direct Prayer Wall link)
- **Challenge detail:** Challenge community feed section (shows prayers tagged with this challenge)
- **Prayer Wall page:** Inline composer at top, challenge-aware category filter

### Incoming CTAs

**Links/buttons in OTHER features pointing INTO Prayer Wall:**
- Navbar: "Prayer Wall" top-level nav link → `/prayer-wall`
- Avatar dropdown: (No "Prayer Wall" link)
- Homepage: JourneySection card (step 5: "Prayer Wall") → `/prayer-wall`
- StartingPointQuiz result: "Prayer Wall" result → `/prayer-wall`
- Daily Hub Pray tab: "Journal about this" CTA → journal (no Prayer Wall link)
- Dashboard Quick Actions: (No Prayer Wall button, community feature, not daily)

### localStorage Keys Owned

- `wr_prayer_bookmarks` — JSON array of bookmarked prayer IDs (user's personal collection)
- `wr_prayer_reactions` — JSON object mapping prayer IDs to `{ prayingCount, bookmarkedFlag }`
- `wr_prayer_reminders_shown` — JSON object tracking which prayer reminders have been shown (for comment notifications)
- `wr_saved_prayers` — JSON array of prayer requests user marked as their own (saved to "My Prayers")

### Mock Data Dependencies

- `/mocks/prayer-wall-mock-data.ts` — 10+ mock users, 18+ prayer requests, comments, reactions
- `/constants/question-of-the-day.ts` — 72 QOTD entries (60 general + 12 liturgical)
- `/constants/prayer-categories.ts` — 8 prayer category definitions

### Test Coverage

- **Page-level tests:** 2 major test files:
  - `PrayerWall.test.tsx` (~400 lines — feed rendering, filtering, composer, reactions)
  - `PrayerWallProfile.test.tsx` (~250 lines — user profile, prayer history)
- **Feature-level tests:** 8+ test files:
  - `PrayerCard.test.tsx` (prayer rendering, reactions, bookmarks)
  - `InlineComposer.test.tsx` (prayer textarea, draft persistence, auth gating)
  - `CommentsSection.test.tsx` (comment threading, add comment, replies)
  - `CategoryFilterBar.test.tsx` (category selection, count updates)
  - `ChallengeIntegration.test.tsx` (challenge filter, prayer categorization)
  - `PrayerWall-challenges.test.tsx` (challenge-aware community feed)
  - `PrayerWall-offline.test.tsx` (offline mode, draft caching)
- **Total coverage:** 10+ test files, 2000+ lines

---

## 7. Challenges (Integration Beyond Grow Surfacing)

### Challenge-to-Prayer Wall Integration

**Prayer Wall surfaces challenges:**
- Active challenge filter pill appears above prayer feed IF `getActiveChallengeInfo()` returns a challenge
- Filter toggle: `isChallengeFilterActive` state toggles between all prayers and prayers tagged with active challenge's `challengeId`
- Filtered prayer feed shows only prayers where `prayer.challengeId === activeChallenge.id`
- Prayers in Prayer Wall UI display "Challenge: [Challenge Title]" tag inline
- Challenge theme color tints the filter pill and prayer cards

**Challenge day actions route to Prayer Wall:**
- Challenge day action type "prayerWall" routes to `/prayer-wall`
- InlineComposer on Prayer Wall includes a "Challenge:" label if post within challenge context
- Posted prayers automatically tagged with active `challengeId`

### Challenge-to-Badges Integration

**Challenge completion triggers badges:**
- Challenge day completion fires `recordActivity('challenge')` → checks badge thresholds
- Challenge progress tracked in `useChallengeProgress()` hook exposes `getProgress(challengeId)` returning `{ currentDay, completedDays: [...] }`
- Badges triggered at day milestones: 7, 15, 30, challenge-length (varies by challenge)
- Badge data: title (e.g., "Challenge Conqueror"), icon, celebration tier, rarity
- Challenge completion celebration overlay shows badge earned + faith points + confetti

### Challenge-to-Faith Points Integration

**Challenge days grant faith points:**
- `completeDay(challengeId, dayNumber)` calls `recordActivity('challenge')` in ChallengeDetail.tsx
- Faith points: 12 pts per challenge day (via `ACTIVITY_POINTS['challenge']`)
- Multiplier applies: if 6+ activities completed that day, multiplier is 2x (24 pts)
- Challenge auto-detection: if user already did the day's action (pray, journal, meditate, etc.), day auto-completes without explicit CTA

### Challenge-to-Notifications Integration

**Challenge reminders (BB-41):**
- Per-challenge reminder flag stored in `wr_challenge_reminders`
- System-level push notification: "Don't forget today's [Challenge Name] action" at user-configured time (if enabled)
- Bell notification in-app: comment on a challenge prayer, reaction to user's challenge prayer

### Challenge-to-Daily Hub Integration

**Challenge day actions link to Daily Hub:**
- Challenge day content includes action type (e.g., "pray", "journal", "meditate")
- "Pray about this" CTA → `/daily?tab=pray`
- "Journal about this" CTA → `/daily?tab=journal`
- "Meditate about this" CTA → `/daily?tab=meditate`
- Daily Hub context: Journal/Pray tabs receive the challenge day's reflection question as the prompt

### Challenge-to-Bible Integration

**Challenge day action "bible":**
- Challenge day specifies a scripture passage reference
- "Read about this" CTA → `/bible/<book>/<chapter>?verse=<n>` (BB-38 deep link)
- BibleReader opens at the challenge passage, optionally highlights it

### Challenge Calendar Computation

**`lib/challenge-calendar.ts` (pure TS, no React):**
- `getActiveChallengeInfo()` — returns `{ challengeId, currentDay, daysElapsed, status: 'active'|'upcoming'|'past', startDate, endDate }`
- `getChallengeCalendarInfo(challenge, today)` — computes challenge status relative to today's date
- Used by: Prayer Wall, GrowPage, Dashboard, Navbar (challenge pulse indicator), inline CTAs
- 5 challenges, staggered throughout the year (110 total days)

### Challenge Data

- Challenge ID (e.g., "lent-2026")
- Title (e.g., "Lent 2026: 40 Days of Deepening Faith")
- Theme color (hex code, e.g., "#8B5CF6" for purple)
- Start date and end date (ISO strings)
- Daily content (110 entries): scripture, reflection, action type + details
- Participant count (mock, hardcoded)
- Community goal (mock, e.g., "20,000 prayers in 40 days")

---

## 8. Starting Point Quiz

### Existence & Current State

**The quiz DOES exist and IS active:**
- Located in `/components/StartingPointQuiz.tsx` (~200 lines)
- Mounted on the homepage (Home.tsx) as the final section before footer
- 5-question points-based quiz, single-select, auto-advance
- 100% client-side, no persistence, no tracking
- Optional link from `FirstRunWelcome` card (BB-34): "Take the Starting Point Quiz"

### Quiz Specification

**Questions:**
1. "What brought you here today?" (4 options)
   - "Going through a hard time" → pray: 2, localSupport: 1
   - "Want to grow my faith" → meditate: 2, journal: 1
   - "Feeling anxious or stressed" → music: 2, meditate: 1
   - "All of the above" → pray: 1, journal: 1, meditate: 1, music: 1

2. "How are you feeling right now?" (4 options)
   - "I need comfort" → pray: 2, music: 1
   - "I feel stuck in my faith" → meditate: 2, journal: 1
   - "I'm okay but want more" → journal: 2, prayerWall: 1
   - "I'm doing well" → prayerWall: 2, music: 1

3. "What sounds most helpful?" (4 options)
   - "Prayer and scripture" → pray: 3
   - "Writing out my thoughts" → journal: 3
   - "Quiet reflection" → meditate: 3
   - "Worship music" → music: 3

4. "When do you most need support?" (4 options)
   - "Mornings" → pray: 1, journal: 1
   - "During stressful moments" → pray: 1, music: 1
   - "At night / bedtime" → sleepRest: 2, music: 1
   - "Throughout the day" → journal: 1, prayerWall: 1

5. "What's your experience with faith practices?" (4 options)
   - "I practice regularly" → prayerWall: 2, journal: 1
   - "I try but not consistent" → meditate: 1, music: 1
   - "I used to but stopped" → pray: 1, meditate: 1
   - "I'm brand new" → pray: 2, localSupport: 1

**Scoring logic:**
- All options have point values for 7 feature keys: `pray`, `journal`, `meditate`, `music`, `sleepRest`, `prayerWall`, `localSupport`
- Tiebreaker: `pray` is first in `FEATURE_KEYS` array, so ties resolve to `pray`

### Quiz Output & Routing

**Result destinations (7 options):**
1. **Pray** → `/pray` (legacy route, redirects to `/daily?tab=pray`)
   - "It sounds like you could use a moment with God..."
   - Verse: 1 Peter 5:7

2. **Journal** → `/journal` (legacy route, redirects to `/daily?tab=journal`)
   - "Writing is a powerful way to process..."
   - Verse: Psalm 139:23

3. **Meditate** → `/meditate` (legacy route, redirects to `/daily?tab=meditate`)
   - "A quiet moment of reflection can bring clarity..."
   - Verse: Psalm 46:10

4. **Music** → `/music`
   - "Sometimes worship music speaks when words can't..."
   - Verse: Psalm 98:1

5. **Sleep & Rest** → `/music?tab=sleep` (sleepRest feature)
   - "Nighttime can be the hardest..."
   - Verse: Psalm 4:8

6. **Prayer Wall** → `/prayer-wall`
   - "You're not alone in this..."
   - Verse: Galatians 6:2

7. **Local Support** → `/local-support/churches`
   - "Sometimes the next step is a real conversation..."
   - Verse: Matthew 18:20

**Result card UI:**
- Feature name
- Description (2-3 sentences)
- Verse + reference
- Primary CTA button with feature name
- Navigation on button click

### Quiz Gating & Access

**The quiz does NOT gate anything:**
- Quiz is optional, on the homepage only
- Accessing the app directly to any feature (via deep link) bypasses the quiz entirely
- No "you must take the quiz" gate
- Taking the quiz does not modify user profile or preferences
- No quiz result persistence (fresh calculation on every visit)
- Logged-out users can take the quiz
- Quiz result does not auto-login the user (they navigate to the feature, hit auth wall if needed)

### Quiz Use Cases

1. **First-time visitor landing on homepage** — optional entry point to pick a starting feature
2. **Marketing funnel** — helps undecided visitors find a relevant feature
3. **Optional link from FirstRunWelcome** (BB-34) — "Take the Starting Point Quiz" link

### Test Coverage

- Test file: `/src/components/__tests__/StartingPointQuiz.test.tsx` (~250 lines)
  - Quiz rendering (questions, options)
  - Answer accumulation
  - Result calculation (tiebreaker logic)
  - Navigation on result
  - Accessibility (keyboard navigation, ARIA labels)
- Integration tests:
  - `Home.test.tsx` includes quiz rendering + interaction coverage

---

## 9. Profile (PrayerWallProfile, Dashboard, GrowthProfile)

### Profile Data Exposed

**User profile surfaces (3 pages):**
1. **PrayerWallProfile** (`/prayer-wall/:userId`) — public prayer history, community stats
   - User avatar, name, "joined X days ago"
   - Prayer count, total "Praying for you" reactions received
   - "My Prayers" feed (prayers user has posted)
   - Community badges (optional, phase 3)
   - Friend action buttons (add friend, send encouragement)

2. **Dashboard** (`/`) — logged-in user's personal growth dashboard
   - User name in hero greeting
   - 7-day mood chart
   - Activity checklist (6 items: mood, pray, journal, meditate, read, listen)
   - Streak counter + faith points + level + badges
   - Friends & leaderboard widget
   - Quick actions to daily practices
   - Growth garden (visual) showing level/stage

3. **GrowthProfile** (`/profile` or `/growth-profile`) — user's detailed growth journey
   - Faith points graph (history over time)
   - Badges earned (locked and unlocked)
   - Streaks (current, longest)
   - Reading progress (Bible heatmap, books started/completed)
   - Challenge history (challenges joined, completed, abandoned)
   - Journal entries count + recent entry preview
   - Prayer count + answered prayers
   - Mood journey (heatmap or line chart)
   - Friends list + mutual friends

### Profile Data Storage

**User profile data stored in localStorage:**
- `wr_user_name` — string (from signup or auth)
- `wr_user_id` — string or UUID (simulated auth)
- `wr_avatar` — (future, not currently in scope)
- `wr_bio` — (future, not currently in scope)

**User stats aggregated from activity keys:**
- Faith points: `wr_faith_points` → computed total
- Badges: `wr_badges` → array of earned badge IDs
- Streak: `wr_streak` → current + longest
- Mood entries: `wr_mood_entries` → count + distribution
- Prayer count: `wr_prayer_list` → array length
- Journal count: computed from Daily Hub journal saves (not explicitly counted)
- Challenge progress: `wr_challenge_progress` → active + completed challenge count

### Profile Cross-Feature Integration

**Data sources for profile:**
1. Faith points system (`useFaithPoints()` hook)
2. Badge engine (`getBadgeData()` from badge-storage.ts)
3. Streak tracking (`useStreakStore()` for Bible streak)
4. Mood tracking (`wr_mood_entries` from Dashboard MoodCheckIn)
5. Prayer list (`wr_prayer_list` from Dashboard)
6. Challenge progress (`useChallengeProgress()` hook)
7. Reading activity (`wr_chapters_visited` heatmap)
8. Bible progress (`plansStore` reading plan progress)

**Profile data rendered in multiple surfaces:**
- **Dashboard cards:** Streak card, badge grid, mood chart, friends preview, activity checklist
- **Prayer Wall profile:** Prayer-specific stats (prayer count, reactions, community presence)
- **Navbar avatar dropdown:** Shows user name, avatar (placeholder), badge count
- **Leaderboard:** User's rank, current week + all-time scores
- **Friends list:** Mutual friends, friend activity feed (milestones achieved)

### Profile Events & Recording

**No explicit "profile view" event** — profile is a read-only aggregation, not an activity

**Profile updates tied to underlying activities:**
- Faith points update when `recordActivity()` fires (any feature)
- Badges update when `saveBadgeData()` fires (triggered by activity thresholds)
- Streak updates via `updateStreak()` when new daily activity recorded
- Mood chart updates when mood check-in submitted
- Challenge progress updates when `completeDay()` fires

---

## Summary: localStorage Keys Master Index

**Total tracked keys: 90+**

### Daily Hub (4 keys)
- `wr_devotional_reads`
- `wr_prayer_draft`
- `wr_journal_draft`
- `wr_journal_mode`

### Bible (22 keys)
- `wr_bible_highlights`, `wr_bookmarks_*`, `wr_bible_notes`, `wr_bible_progress`
- `wr_chapters_visited`, `wr_memorization_cards`, `wr_echo_dismissals`
- `wr_bible_streak`, `wr_bible_reader_*` (6 keys)
- `wr_bible_active_plans`, `wr_bible_books_tab`, `wr_bible_drawer_stack`
- `bb32-v1:explain:*`, `bb32-v1:reflect:*` (AI cache namespace)

### Grow (6 keys)
- `wr_challenge_progress`, `wr_challenge_reminders`
- `wr_reading_plan_progress`, `wr_bible_active_plans`
- `wr_custom_plans`, `wr_challenge_nudge_shown`

### Music (8 keys)
- `wr_listening_history`, `wr_saved_mixes`, `wr_sleep_timer`, `wr_routines`
- `wr_bible_reader_ambient_*` (4 keys, overlapping with Bible)

### Prayer Wall (4 keys)
- `wr_prayer_bookmarks`, `wr_prayer_reactions`, `wr_prayer_reminders_shown`, `wr_saved_prayers`

### Local Support (2 keys)
- `wr_local_visits`, `wr_location_last_search`

### Dashboard / Faith Points / Badges (15 keys)
- `wr_daily_activities`, `wr_faith_points`, `wr_streak`
- `wr_badges`, `wr_mood_entries`, `wr_prayer_list`
- `wr_leaderboard_global`, `wr_social_interactions`
- `wr_friends`, `wr_milestone_feed`, `wr_notifications`
- `wr_anniversary_milestones_shown`, `wr_dashboard_collapsed`, `wr_dashboard_layout`
- `wr_gratitude_entries`, `wr_evening_reflection`

### Auth / Settings / Onboarding (15+ keys)
- `wr_auth_simulated`, `wr_user_name`, `wr_user_id`
- `wr_first_run_completed`, `wr_onboarding_complete`, `wr_getting_started`
- `wr_settings`, `wr_notification_prefs`, `wr_notification_prompt_dismissed`
- `wr_push_subscription`
- `wr_visit_count`, `wr_session_state`, `wr_session_counted`
- `wr_install_dashboard_shown`, `wr_install_dismissed`
- `wr_welcome_back_shown`, `wr_tooltips_seen`

### Seasonal / Feature Flags (6+ keys)
- `wr_seasonal_banner_dismissed_*` (multiple seasonal variants)
- `wr_gratitude_callback_last_shown`, `wr_last_surprise_date`
- `wr_midnight_verse_shown`, `wr_weekly_summary_dismissed`

---

## Key Cross-Feature Patterns

### Pattern 1: Activity Recording → Faith Points → Badges → Celebrations

**Flow:**
1. User completes an action (pray, journal, meditate, challenge day, etc.)
2. Component calls `recordActivity(type)` via `useFaithPoints()` hook
3. Faith points storage updates: `wr_daily_activities`, `wr_faith_points`, `wr_streak`
4. Streak updates via `updateStreak()` (daily reset logic)
5. Badge engine checks if new badge thresholds reached via `getBadgeData()` + `saveBadgeData()`
6. If milestone badge triggered, `CelebrationQueue` fires celebration overlay (confetti, glow, animation)
7. Dashboard widget updates in real-time (no hard refresh needed, React state bound to localStorage via hooks)

**Features using this pattern:**
- Daily Hub (Pray, Journal, Meditate tabs)
- Challenges (day completion)
- Prayer Wall (posting prayer, adding comment)
- Bible (reading chapters, adding notes/highlights — Phase 3 only)
- Music (playing audio)
- Local Support (visiting location)

### Pattern 2: Completion Tracking → Activity Checklist → Multiplier Tiers

**Activity types:**
- `mood` (5 pts)
- `pray` (10 pts)
- `journal` (25 pts)
- `meditate` (20 pts)
- `listen` (10 pts)
- `prayerWall` (15 pts, 5 pts for comment)
- `readingPlan` (variable)
- `challenge` (12 pts)
- `gratitude` (5 pts)
- `reflection` (10 pts)
- `localVisit` (5 pts)
- `devotional` (tracked, not explicitly recorded)

**Multiplier tiers (based on activity count per day):**
- 0-2 activities: 1.0x
- 3-4 activities: 1.25x
- 5+ activities: 1.5x
- 6+ activities: 2.0x

**Activity checklist UI (Dashboard):**
- Shows 6 slots: mood, pray, journal, meditate, read, listen
- Each completed activity shows checkmark + green glow
- Progress ring shows X/6 activities
- Multiplier badge shows current tier

### Pattern 3: Cross-Tab Context Passing (Daily Hub)

**Devotional → Journal/Pray:**
1. User reads devotional, clicks "Journal about this question"
2. `DevotionalTabContent` calls `onSwitchToJournal(theme, customPrompt, snapshot)`
3. `DailyHub.tsx` stores `prayContext = { from: 'devotional', topic: theme, customPrompt, devotionalSnapshot: snapshot }`
4. Navigates to `/daily?tab=journal` via `setTab('journal')`
5. `JournalTabContent` renders `DevotionalPreviewPanel` (sticky, collapsible, dismissible)
6. Journal textarea pre-filled with `customPrompt` (the reflection question)
7. User writes entry referencing the devotional context
8. On save, context is cleared and `prayContext` is nullified

**Prayer → Journal:**
1. User prays, clicks "Journal about this"
2. `PrayTabContent` calls `onSwitchToJournal(topic)` with just the prayer topic
3. `DailyHub.tsx` stores `prayContext = { from: 'pray', topic }`
4. Journal prompt becomes "Write about: [prayer topic]"
5. On save, context clears

### Pattern 4: Challenge-Aware Filtering (Prayer Wall, Dashboard)

**Active challenge detection:**
1. `getActiveChallengeInfo()` computes which challenge is active today
2. Returns `{ challengeId, currentDay, status: 'active'|'upcoming'|'past', startDate, endDate }`
3. Prayer Wall: renders challenge filter pill if active
4. Prayer Wall: `isChallengeFilterActive` toggle filters feed by `challengeId`
5. Navbar: shows small pulse indicator (colored dot) on Grow link if active
6. GrowPage Challenges tab: highlights active challenge card
7. Dashboard: ChallengeWidget shows active challenge progress
8. Inline CTAs: challenge day descriptions show which feature action is required

### Pattern 5: localStorage Reactive Stores (Bible Wave Pattern)

**Pattern A (useSyncExternalStore hook):**
- `useMemorizationStore()` — single hook subscribes externally
- `useStreakStore()` — single hook subscribes externally
- Clean, single-hook pattern

**Pattern B (useState + subscribe):**
- `highlightStore.subscribe()` → component `useState` + `useEffect`
- `bookmarkStore.subscribe()` → component `useState` + `useEffect`
- `noteStore.subscribe()` → component `useState` + `useEffect`
- `journalStore.subscribe()` → component `useState` + `useEffect`
- `chapterVisitStore.subscribe()` → component `useState` + `useEffect`
- `plansStore.subscribe()` → component `useState` + `useEffect`

**BB-45 anti-pattern (WRONG):**
```tsx
const allCards = useMemorizationStore().getAllCards() // Snapshot
const [cards, setCards] = useState(allCards)
// Component will NOT re-render when store updates because useState is not subscribed
```

**Correct pattern:**
```tsx
const cards = useMemorizationStore() // Hook internally subscribes via useSyncExternalStore
// Component WILL re-render when store updates
```

### Pattern 6: Auth Gating with Draft Persistence (Spec V)

**Flow:**
1. Logged-out user types into Pray or Journal textarea
2. Draft auto-saves every 1s to `wr_prayer_draft` or `wr_journal_draft`
3. User clicks "Help Me Pray" or "Save Entry"
4. AuthModal opens with subtitle: "Your draft is safe — we'll bring it back after"
5. After login, user lands back on the same tab (Pray or Journal)
6. Draft is re-hydrated from localStorage into the textarea
7. User sees their work preserved across the auth flow

**Features using this pattern:**
- Daily Hub Pray tab
- Daily Hub Journal tab
- Prayer Wall inline composer (logged-out users can type, draft persists)

### Pattern 7: Challenge Auto-Detection (Spec AA)

**Flow:**
1. User on `/challenge/:challengeId/day/15`
2. Challenge day 15 action type is "pray" (requires saving a prayer to complete day)
3. `useChallengeAutoDetect()` hook watches for activity
4. User goes to Daily Hub, completes the prayer (saves to `wr_prayer_draft`)
5. Hook detects: `recordActivity('pray')` fired AND user has active challenge
6. Hook calls `completeDay(activeChallenge.challengeId, 15)` automatically
7. User gets notification + celebration overlay showing day marked complete

**Benefits:**
- Seamless UX: user doesn't return to challenge page, day auto-completes
- Works across any feature (pray, journal, meditate, music, etc.)

---

## Test Coverage Summary

| Feature | Test Files | Coverage |
|---------|-----------|----------|
| Daily Hub | 25 | Tabs, cross-tab context, draft persistence, crisis detection, completions |
| Bible | 25+ | Reader, search, highlights, notes, bookmarks, heatmap, memorization, echoes, deep links, stores |
| Grow (Plans + Challenges) | 15 | Plan switching, challenge joining/completion, auto-detection, progress tracking |
| Music | 10 | Audio state, drawer, scenes, sleep timer, integration with Daily Hub |
| Prayer Wall | 10 | Feed, filtering, composer, reactions, comments, challenge integration |
| Dashboard | 20+ | Mood check-in, activity checklist, badges, faith points, widgets, growth garden |
| Shared/Integration | 30+ | Auth, onboarding, first-run welcome, notifications, PWA, accessibility |
| **Total** | **643+** | **High coverage on all major feature surfaces and cross-feature integrations** |

---

**End of Recon Report**

This document is comprehensive and specific enough to drive Round 3 Prayer Wall and Profile specifications. It catalogues every data exposure surface, event tracking point, component rendering location, and incoming CTA in the Worship Room frontend codebase.
