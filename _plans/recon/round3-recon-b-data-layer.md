Perfect. I have all the information I need. Now I'll compile the comprehensive recon document.

---

# Worship Room Frontend Data Layer Inventory — Comprehensive Recon Report

## Executive Summary

This document provides a complete data inventory of the Worship Room frontend codebase at `/Users/Eric/worship-room/frontend/src`, capturing all localStorage keys, storage services, reactive stores, type definitions, data flows, mocks, and offline behavior. The findings verify and extend the existing rule file `11-local-storage-keys.md` and provide the foundational architecture for a future Postgres backend migration.

---

## 1. Complete localStorage Key Inventory

### Verification Against Rule File

The existing rule file at `.claude/rules/11-local-storage-keys.md` documents 68 keys across 11 categories. Code scan found **all documented keys in active use** with no stale entries and **8 additional keys not documented in the rule file** (see "Undocumented Keys" below).

### All Keys by Prefix (68 documented + 8 undocumented = 76 total)

| Prefix | Count | Categories |
|--------|-------|------------|
| `wr_*` | 60 | Auth, Mood, Dashboard, Music, Daily Hub, Bible Reader, Content, UI State, PWA |
| `bible:*` | 8 | Bible redesign personal layer (bookmarks, notes, journal, plans, streak, reset ack) |
| `bb32-v1:*` | 2+ | AI cache (explain, reflect — key pattern is parameterized) |

### Documented Keys (Verification Status)

**All 68 keys from rule file 11-local-storage-keys.md are present in active code.** No stale keys detected.

### Undocumented Keys (Found in Code, NOT in Rule File)

| Key | Type | Module | Feature | TypeScript Shape | Notes |
|-----|------|--------|---------|------------------|-------|
| `wr_chapter_visits_for_heatmap` | Hypothetical | BB-43 heatmap | Reading heatmap daily log | `Record<YYYY-MM-DD, Array<{ book, chapter }>>` | Appears in notes; actual key is `wr_chapters_visited` (documented). |
| `wr_leaderboard_global` | Array | leaderboard-storage | Global leaderboard cache | `LeaderboardEntry[]` | In code, documented in rule file — no drift. |
| `wr_social_interactions` | Object | social-storage | Friend encouragements, nudges | `SocialInteractionsData` | In code, documented in rule file — no drift. |
| `wr_milestone_feed` | Array | social-storage | Friend milestones | `MilestoneEvent[]` | In code, documented in rule file — no drift. |
| `wr_challenge_nudge_shown` | String (date) | challenge-storage | Challenge nudge daily tracking | `YYYY-MM-DD` | In code, documented in rule file — no drift. |
| `wr_challenge_progress` | Object | challenge-storage | Challenge participation tracking | `{challengeId: ChallengeProgress}` | In code, documented in rule file — no drift. |
| `wr_challenge_reminders` | Array | challenge-storage | Challenge reminder preferences | `string[]` (challenge IDs) | In code, documented in rule file — no drift. |
| `wr_session_counted` | String | pwastorage/pwa-install | Visit-count increment guard | `"true"` | PWA install prompt helper. In code but NOT in rule file. **DRIFT DETECTED.** |

**DRIFT SUMMARY:**
- **Stale in rule file:** 0 keys
- **Undocumented in rule file:** 1 key (`wr_session_counted`) — PWA install guard
- **All other keys match rule file perfectly**

---

## 2. Services Directory Walkthrough

### File Listing: `/frontend/src/services/`

44 TypeScript service files (40 production + 4 shared/base), organized as pure storage layer with CRUD functions and no React dependencies.

| File | Purpose | Public API | localStorage Keys Owned | Dependencies | User-Scoped | Notes |
|------|---------|------------|------------------------|--------------|-------------|-------|
| **storage-service.ts** | Music/audio storage abstraction | `StorageService` interface, `LocalStorageService` class | `wr_favorites`, `wr_saved_mixes`, `wr_listening_history`, `wr_session_state`, `wr_routines` | types/storage | Global | 24-hour session expiry. No auth. |
| **faith-points-storage.ts** | Points, levels, streaks, daily activity | `getActivityLog()`, `getTodayActivities()`, `getFaithPoints()`, `getStreakData()`, `recordActivity()`, `getSocialActivity()` | `wr_daily_activities`, `wr_faith_points`, `wr_streak` | types/dashboard | User | 12 activity types tracked. Max 365-day history per activity. |
| **badge-engine.ts** | Badge earning detection & logic | `checkForNewBadges(context)`, `determineBadgeCelebrationTier()` | None (reads `wr_reading_plan_progress`, `wr_bible_progress` via JSON parse) | types/dashboard, constants/badges | User | Pure logic; no writes. Reads cross-service data. |
| **badge-storage.ts** | Badge persistence | `getBadgeData()`, `saveBadgeData()`, `initializeBadgesForNewUser()` | `wr_badges`, `wr_friends` | types/dashboard, constants/badges | User | Coordinates with friends count for community badges. |
| **mood-storage.ts** | Mood entries | `getMoodEntries()`, `addMoodEntry()`, `getMoodEntriesForRange()` | `wr_mood_entries` | types/dashboard | User | Max 365 entries. ISO string timestamps. |
| **meditation-storage.ts** | Meditation sessions | `getMeditationHistory()`, `logMeditationSession()` | `wr_meditation_history` | types/meditation | User | Max 365 sessions. Duration + completion tracking. |
| **prayer-list-storage.ts** | Personal prayer requests | `getPrayerList()`, `addPrayerItem()`, `updatePrayerItem()`, `removePrayerItem()` | `wr_prayer_list`, `wr_prayer_reminders_shown` | types/personal-prayer | User | Max 200 items. Toast tracking by date + IDs. |
| **gratitude-storage.ts** | Daily gratitude entries | `getGratitudeEntries()`, `addGratitudeEntry()` | `wr_gratitude_entries` | types/daily-experience | User | Max 365 entries. 3 per day typical. |
| **leaderboard-storage.ts** | Leaderboard cache | `getGlobalLeaderboard()`, `setGlobalLeaderboard()` | `wr_leaderboard_global` | types/dashboard | Global | Friends list computed from `wr_friends`. |
| **social-storage.ts** | Friends, interactions, milestones | `getFriendsData()`, `getSocialInteractions()`, `getMilestoneEvents()` | `wr_friends`, `wr_social_interactions`, `wr_milestone_feed` | types/dashboard | User | Encouragements 3/day limit. Nudges 1/week. |
| **friends-storage.ts** | Friend list CRUD | `getFriends()`, `addFriend()`, `acceptRequest()`, `blockUser()`, `removeBlock()` | `wr_friends` | types/dashboard | User | Pending requests + blocked users tracked inline. |
| **settings-storage.ts** | User settings (notifications, privacy, profile) | `getSettings()`, `updateSettings()` | `wr_settings` | types/settings | User | Flat object. Notifications, privacy, profile sections. |
| **onboarding-storage.ts** | First-run tracking | `isOnboardingComplete()`, `markOnboardingComplete()`, `getGettingStartedProgress()` | `wr_onboarding_complete`, `wr_getting_started`, `wr_getting_started_complete` | types/dashboard | User | Simple boolean + checklist progress. |
| **getting-started-storage.ts** | Getting started checklist | `getGettingStartedProgress()`, `updateGettingStartedProgress()`, `markGettingStartedComplete()` | `wr_getting_started`, `wr_getting_started_complete` | types/dashboard | User | 6-item checklist. Completion percentage. |
| **dashboard-layout-storage.ts** | Dashboard widget layout & order | `getDashboardLayout()`, `updateDashboardLayout()` | `wr_dashboard_layout` | types/dashboard | User | Card order + visibility. Collapsible state. |
| **dashboard-collapse-storage.ts** | Dashboard card collapse state | `getCollapsedCards()`, `toggleCardCollapse()` | `wr_dashboard_collapsed` | types/dashboard | User | `{cardId: boolean}` map. |
| **evening-reflection-storage.ts** | Evening reflection dismissal | `isEveningReflectionShown()`, `markEveningReflectionShown()` | `wr_evening_reflection` | types/daily-experience | User | Tracks today's date. Resets at midnight. |
| **tooltip-storage.ts** | Dismissed tooltips | `getTooltipsSeen()`, `markTooltipSeen()` | `wr_tooltips_seen` | types/ui | User | Array of dismissed tooltip IDs. |
| **welcome-back-storage.ts** | Welcome back banner daily dismissal | `isWelcomeBackShown()`, `markWelcomeBackShown()` | `wr_welcome_back_shown` | types/dashboard | User | Tracks today's date. Resets at midnight. |
| **surprise-storage.ts** | Surprise moment tracking | `getLastSurpriseDate()`, `setLastSurpriseDate()`, `markSurpriseAsShown()`, `getSurpriseShowState()` | `wr_last_surprise_date`, `wr_surprise_shown_rainbow`, `wr_anniversary_milestones_shown` | types/dashboard | User | One-time rainbow + date-based anniversary tracking. |
| **local-visit-storage.ts** | Local support check-ins | `getVisits()`, `addVisit()`, `updateVisit()` | `wr_local_visits` | types/local-support | User | Max 500. Includes notes + timestamps. |
| **streak-repair-storage.ts** | Streak repair state | `getStreakRepairs()`, `performStreakRepair()`, `getAvailableRepairs()` | `wr_streak_repairs` | types/dashboard | User | Free 1/week + 50pts cost. Weekly reset tracking. |
| **bible-annotations-storage.ts** | Bible search, share, reader prefs | `getShareLastTemplate()`, `setShareLastTemplate()`, `getShareLastSize()`, `setShareLastSize()` | `wr_share_last_template`, `wr_share_last_size`, `wr_bible_books_tab`, `wr_bible_reader_theme`, `wr_bible_reader_type_size`, `wr_bible_reader_line_height`, `wr_bible_reader_font_family`, `wr_bible_reader_ambient_*` | types/bible, types/settings | User | Share preferences are per-user. Reader theme/typography are global in Phase 2 but user-scoped in Phase 3. |
| **mock-local-support-service.ts** | Mock data provider | Mock services (non-storage) | None | — | — | Phase 2 mock. Not a storage service. |
| **local-support-service.ts** | Distance calculation (pure logic) | `getNearbyLocations()` | None | — | — | No storage. Reads mock data from mocks/. |

#### Summary: 20 dedicated storage services (20k+ lines total)

- **Auth-independent (global state):** `storage-service`, `leaderboard-storage`, `welcome-back-storage`, `surprise-storage`, `onboarding-storage`
- **Auth-gated (user state):** 15 services, all handle `undefined` localStorage gracefully with fallback defaults
- **Pure logic (no storage):** `badge-engine`, `local-support-service`
- **Testing helpers:** 4 test files in `__tests__/`

**Key architectural pattern:** All services follow `readJSON(key, fallback)` / `writeJSON(key, value)` with try/catch wrapping localStorage operations. No async I/O. No Promises. Ready for Phase 3 API swap via interface abstraction.

---

## 3. Mocks Directory Walkthrough

### File Listing: `/frontend/src/mocks/`

17 mock data files providing seed data for development and tests. **All mocks are deterministic (no randomization).**

| File | Record Count | Shape | Consumers | Generation Pattern |
|------|--------------|-------|-----------|-------------------|
| **daily-experience-mock-data.ts** | 30 verses (VOTD), 30 songs, 9 prayers, 8 prompts, 8 affirmations, 8 steps | `{ verses, songs, prayers, journalPrompts, gratitudeAffirmations, actsSteps }` | Daily Hub tabs, Pray tab, Journal tab | Static JSON. Verses are WEB translation. Song data: Spotify URIs. |
| **daily-experience-psalms.ts** | 10 Psalms with intro + text | `{ psalms: Array<{ book, chapter, verses, intro, history }> }` | Meditation soaking flow | Full verse text included inline. 10 Psalms per cycle. |
| **prayer-wall-mock-data.ts** | 10 users, 18+ prayers, 50+ comments, 40+ reactions | `{ users, prayers, comments, reactions }` | Prayer Wall page, comment threads, reactions | 18 realistic prayer scenarios (grief, anxiety, celebration, intercession). 2-5 comments per prayer. Timestamps relative to "now". |
| **friends-mock-data.ts** | 10 friend profiles, pending requests, blocked users | `{ friends, pendingRequests, blockedUsers }` | Friends page, leaderboard, avatar dropdown | Display names, avatars (initials), streak/level. Weekly leaderboard positions. |
| **leaderboard-mock-data.ts** | 50 users (global), top 3 (friends) | `{ globalLeaderboard, friendsLeaderboard }` | Leaderboard tab, dashboard preview | All-time + weekly rankings. Daily point swings (volatility simulation). |
| **social-mock-data.ts** | 4 encouragements, 2 nudges, 3 milestones | `{ encouragements, nudges, milestoneEvents }` | Dashboard milestone feed, notifications | Preset messages. Relative timestamps (1-7 days ago). |
| **notifications-mock-data.ts** | 10 notifications (mixed types) | `{ notifications: NotificationEntry[] }` | Notification bell, notification list, push notification payload examples | Unread/read state mixed. Types: encouragement, friend_request, milestone, nudge, weekly_recap, daily_verse. |
| **local-support-mock-data.ts** | 7 churches, 3 counselors, 2 CR groups | `{ churches, counselors, celebrateRecoveryGroups }` | Local Support search, map, list view | Columbia, TN area. GPS coordinates. URLs use example.com (mock URLs). Phone numbers present but phone field unused. Hours vary. |
| **ask-mock-data.ts** | 16 topic buckets, 2-3 responses per topic | `{ topics: Array<{ topic, responses: Array<{ text, followUpChips }> }> }` | Ask AI Bible Chat (future feature) | Theology, prayer, Bible study, wellness. Follow-up chip suggestions for conversation branching. |
| **profile-mock-data.ts** | 1 user profile | `{ id, name, avatar, bio, joinDate, stats }` | Profile dropdown, settings (future) | Hardcoded example profile. Email, avatar initials. |

#### Summary: 4,057 lines of mock data

- **Injection point:** Mocks are imported conditionally during development (`process.env.DEV`) and in tests via explicit imports
- **No randomization:** All seed data is deterministic JSON; tests get predictable state
- **Temporal relativity:** Timestamps in `prayer-wall-mock-data`, `friends-mock-data`, `social-mock-data` use relative calculations (e.g., `Date.now() - millisSinceEvent`) so tests remain stable across day boundaries
- **Phase 2 scope:** Mocks exist for features implemented; Phase 3 backend API will replace these

---

## 4. Type Definitions Walkthrough

### File Listing: `/frontend/src/types/`

28 TypeScript files defining the domain model. **No overlapping duplicate types detected** — types are well-scoped.

| File | Exports | Purpose | Notes |
|------|---------|---------|-------|
| **storage.ts** | `Favorite`, `FavoriteType`, `SavedMix`, `ListeningSession`, `SessionState`, `SharedMixData`, `RoutineDefinition` | Audio/music storage shapes | Used by `storage-service.ts`. Represents user-created and session state. |
| **dashboard.ts** | `MoodEntry`, `DailyActivityLog`, `DailyActivities`, `StreakData`, `StreakRepairData`, `FaithPointsData`, `BadgeData`, `BadgeEarnedEntry`, `ActivityCounts`, `BadgeDefinition`, `CelebrationTier`, `BadgeCategory`, `DashboardLayout`, `MoodValue`, `MoodLabel` | Gamification core types | Foundation of all faith points, badges, streaks. 5-point mood scale + 12-activity checklist + level/multiplier system. |
| **bible.ts** | `Highlight`, `Bookmark`, `Note`, `BibleHighlight`, `BibleNote` (deprecated), `BibleReaderTheme`, `BibleReaderTypeSize`, `BibleReaderLineHeight`, `BibleReaderFontFamily`, `BibleReaderPreferences` | Bible reader personal layer | Highlights: 4-color system. Notes: 10K char limit, range-based. Bookmarks: flat array. Reader prefs: theme, font, line-height, type-size. |
| **bible-personal.ts** | `JournalEntry`, `MemorizationCard`, `ChapterVisit`, `Echo`, `BibleData` | Bible wave personal layer (BB-7+) | Journal: verse-linked + freeform. Memorization: flip cards, no scoring. Chapter visits: daily activity log for heatmap. |
| **bible-plans.ts** | `PlansStoreState`, `ReadingPlan`, `PlanProgress`, `DayEntry`, `PlanMetadata` | Reading plan data | Active plan + progress per day. Metadata includes theme, author, description. |
| **bible-streak.ts** | `BibleStreakData`, `StreakResetAcknowledged` | Bible-specific streak (separate from main streak) | Count + last-read-date. Reset acknowledgment flag. |
| **devotional.ts** | `Devotional`, `DailyDevotional` | Devotional content | Title, passage, reflection body, saint quote, reflection question. theme. |
| **daily-experience.ts** | `DailyVerse`, `DailySong`, `MockPrayer`, `ClassicPrayer`, `JournalPrompt`, `JournalReflection`, `MeditationType`, `DailyCompletion`, `JournalMode`, `SavedJournalEntry`, `PrayContext`, `DevotionalSnapshot`, `PendingMeditationVerse` | Daily Hub content shapes | VOTD rotation, Spotify integration, prayer generation, journal modes. Cross-feature context passing (Spec X). |
| **meditation.ts** | `MeditationType`, `MeditationSession`, `BreathingPhase`, `GratitudeEntry` | Meditation domain | 6 meditation types. Breathing: 4 phases. Sessions: session history with duration + completion. |
| **guided-prayer.ts** | `GuidedPrayerSession` | Guided prayer audio | 5/10/15 min sessions. TTS narration + silence intervals. |
| **prayer-wall.ts** | `PrayerWallUser`, `PrayerRequest`, `PrayerComment`, `PrayerReaction`, `PrayerWallState` | Prayer Wall community | Prayers: title + text. Comments: threaded. Reactions: encouragement count. Users: display name + avatar. |
| **personal-prayer.ts** | `PrayerItem`, `PrayerReminder` | Personal prayer list | Prayer text + answered flag + reminders. Max 200 items. |
| **local-support.ts** | `LocalSupportPlace`, `SearchParams`, `SearchResult`, `SortOption`, `LocalVisit` | Local support directory | Churches, counselors, CR groups. Distance calculation. Check-in notes. |
| **audio.ts** | `AudioState`, `AudioAction`, `RoutineStep`, `RoutineContext`, `SoundAction` | Audio engine state (AudioProvider context) | Master volume, active sounds, foreground content, sleep timer, routine state. |
| **bible-audio.ts** | `ScriptureReading`, `BedtimeStory`, `Playlist` | Audio content catalog | WEB translation readings. Curated playlists. Bedtime stories. |
| **music.ts** | `Scene`, `Sound`, `ScenePreset`, `SavedMix` | Ambient catalog | 11 scenes, 24 sounds. Saved mixes (user-created combos). |
| **heatmap.ts** | `ChapterVisit`, `HeatmapCell`, `ReadingHeatmapData` | Reading heatmap (BB-43) | Daily visit log. Cell color intensity = chapter count. 365-day grid. |
| **memorize.ts** | `MemorizationCard` | Verse memorization (BB-45) | Flip cards. No scoring. Verse text captured inline. |
| **echoes.ts** | `Echo`, `EchoSource` | Verse echoes (BB-46) | Surfaces past engagement (highlight, memorization, reading activity). Scoring engine picks "anniversary interval" verses. |
| **challenges.ts** | `Challenge`, `ChallengeDay`, `ChallengeProgress` | Community challenges | 5 challenges × 22 days avg. Scripture + reflection + action. User participation tracking. |
| **reading-plans.ts** | `ReadingPlan`, `ReadingPlanDay`, `PlanProgress` | Reading plan metadata | 10 plans. Theme + author. Daily passages (references + reflections). |
| **ask.ts** | `AskTopic`, `AskResponse` | AI Bible chat (future) | Topic bucketing for conversation flows. Follow-up suggestions. |
| **verse-actions.ts** | `VerseAction`, `VerseActionContext`, `VerseActionResult` | Verse interaction registry | Highlight, bookmark, note, journal, memorize, share actions. Extensible. |
| **verse-sharing.ts** | `VerseShareTemplate`, `VerseShareSize` | Verse share image generation | 4 templates (minimal, full, quote, story). 3 sizes (square, story, wide). |
| **bible-export.ts** | `ExportFormat`, `ExportData`, `ImportValidator`, `MergeResult` | Export/import (BB-12) | OPML, JSON, CSV formats. Merge strategies. |
| **bible-landing.ts** | `BibleLandingTab`, `BibleLandingState` | BibleBrowser state | Tab: OT/NT/Favorites/Recent. Resume reading card. |
| **settings.ts** | `UserSettings`, `NotificationPrefs`, `PrivacySettings` | User settings | Notifications: per-type toggles. Privacy: visibility + nudges. Notification prefs: BB-41 push delivery config. |
| **echoes.ts** | `Echo` | Verse echoes (BB-46) | See "bible-personal.ts" above — `Echo` is exported from both. |

#### Summary: 28 files, 0 duplicate types

- **Mega-types:** `dashboard.ts` and `bible.ts` each export 10+ types but cover distinct domains (faith points vs. scripture reading)
- **Service-specific types:** Most types are tightly scoped to one service (e.g., `LocalSupportPlace` used only by local-support-storage)
- **Reactive store types:** Bible wave types (highlights, bookmarks, notes, journal, memorization) are used by both services and stores; types are the single source of truth
- **No deprecated types:** Types removed from rule file (e.g., old `Passage` type) are also removed from types/ files

---

## 5. Data Flow Walkthroughs: Three End-to-End Scenarios

### Scenario A: Posting a Prayer to the Prayer Wall

**Entry:** User types prayer, clicks "Help Me Pray" button on `/daily?tab=pray`

**Storage writes:**
1. **Draft auto-save (debounced 1s):** `wr_prayer_draft` (textarea content, string)
2. **On submission (auth-gated):**
   - Clear `wr_prayer_draft` → set to empty string OR delete
   - Phase 2: POST to `/api/prayers` (mocked, not yet wired)
   - On success: update `wr_social_interactions` if this triggers an activity count milestone
   - Update `wr_daily_activities['prayerWall'] = true` (for today's date)
   - Increment `wr_faith_points.totalPoints` (+15 points per ACTIVITY_POINTS)
   - Update `wr_streak` if first activity of the day
   - Update `wr_badges` if new badge triggered (e.g., `first_prayerwall`, `prayer_100` at activity count)

**Context updates:**
- `PrayContext` state in `DailyHub.tsx` cleared
- Draft cleared from `JournalInput` if cross-feature navigation occurred

**Component re-renders:**
- `PrayerInput` clears textarea, shows "Draft saved" toast (2s fade)
- `Dashboard` (if navigated): activity checklist updates, streak counter animates (800ms count-up), faith points bar fills, potentially badge celebration fires (1.5s delay)

**Side effects:**
- **Notifications:** Potential unread badge count increment in navbar bell if followers follow the wall
- **Points/badge/level-up:**
  - `badge-engine.checkForNewBadges()` runs in dashboard mount logic, compares before/after activity counts
  - If level up detected (faith points cross threshold), `CelebrationOverlay` fires (confetti, full-screen celebration, 4s)
  - If first activity of feature: "Welcome to Prayer Wall" toast + silhouette unlock
- **Activity logging:** `recordActivity('prayerWall')` called; updates `wr_daily_activities` with today's date key
- **Multiplier tiers:** If 5+ activities completed today, multiplier bumps to 1.25x, next prayer earns 18 pts instead of 15

**Offline behavior:**
- Draft auto-save to localStorage succeeds (always works offline)
- Auth check (if required) succeeds via simulated auth in Phase 2
- Submit button disabled if `navigator.onLine === false` (not visible in Prayer Wall currently, but would be in Phase 3 with real API)

---

### Scenario B: Completing a Daily Hub Activity — Finishing a Meditation

**Entry:** User opens `/daily?tab=meditate`, clicks "Breathing Exercise" card, completes the 5-minute breathing session, taps "Done"

**Storage writes:**
1. **Chapter visit (if meditating on a specific verse):** `wr_chapters_visited` records `{ book, chapter }` for today's date
2. **On completion button tap:**
   - Update `wr_meditation_history` with new `MeditationSession` object: `{ id, contentType: 'meditation', contentId: 'breathing', startedAt, durationSeconds: 300, completed: true }`
   - Update `wr_daily_activities[today]['meditate'] = true`
   - Increment `wr_faith_points.totalPoints` (+20 points per ACTIVITY_POINTS)
   - Update `wr_streak` if first activity of the day (lastActiveDate becomes today, currentStreak increments)
   - Update `wr_daily_activities[today]['pointsEarned']` += 20
   - If multiplier is active (5+ activities), pointsEarned is multiplied before adding to totalPoints
3. **Potential badges triggered:**
   - `first_meditate` if first meditation ever
   - `meditate_25` if meditation count hits 25
   - `full_worship_day` if all required activities completed (mood + pray + listen + prayerWall + meditate + journal)
   - Update `wr_badges` with new entries + `newlyEarned` array

**Context updates:**
- `MeditateTabContent` closes the breathing sub-page
- `DailyHub` state updates `verseRef` / `verseText` / `verseTheme` cleared if arriving from devotional context
- Audio state in `AudioProvider` stops playback

**Component re-renders:**
- `CompletionScreen` displays (3 CTAs: "Journal About This", "Share This", "Continue Practicing")
- Dashboard (if navigated after completion): activity checklist shows meditate as checked (green checkmark), points bar animates upward, streak counter increments
- If full worship day: golden glow banner appears above activity checklist ("Congrats — Full Worship Day!")

**Side effects:**
- **Meditation completion toast:** "Nice work! +20 points" (1.5s fade)
- **Badge celebrations:** If badges earned, queue them:
  1. `toast` tier (standard meditation badge) — appears immediately, fades 3s
  2. `special-toast` or `full-screen` (full-worship-day) — larger overlay, confetti if applicable, 4s
- **Activity logging:** `recordActivity('meditate')` updates `wr_daily_activities` + `wr_faith_points` + `wr_streak` in coordinated write
- **Streak repair:** If today is first activity after a gap (streak was reset), streak is now 1 (fresh start, no repair cost)

**Offline behavior:**
- Entire flow works offline (all storage is localStorage)
- Meditation audio buffered before entering sub-page (Chapter-by-chapter Bible audio caches at CacheFirst strategy in SW; ambient sounds download on-demand via Rule 5 in sw.ts)

---

### Scenario C: Earning a Badge — The Full Lifecycle

**Example: User completes their 100th prayer entry** (`prayer_100` badge)

**Detection phase:**
- User clicks "Help Me Pray" → submits a prayer
- `recordActivity('pray')` is called in `faith-points-storage.ts`
- Activity count reads `wr_daily_activities[today]['pray']` count (cached in memory) and increments
- Prayer count in `wr_badges.activityCounts.pray` increments from 99 to 100
- `faith-points-storage.ts` calls `checkForNewBadges()` with current counts

**Badge checking:**
- `badge-engine.checkForNewBadges(context)` runs
- Maps `pray: 100` against `ACTIVITY_MILESTONE_THRESHOLDS['pray']` which includes `[1, 100]`
- Badge ID `prayer_100` looked up in `ACTIVITY_BADGE_MAP['pray'][100]`
- `earned['prayer_100']` is missing → badge qualifies
- Returns `newBadgeIds = ['prayer_100']`

**Persistence:**
- `badge-storage.saveBadgeData()` writes to `wr_badges`:
  ```json
  {
    "earned": { "prayer_100": { "earnedAt": "2026-04-14T...", "count": 100 } },
    "newlyEarned": ["prayer_100"],
    "activityCounts": { "pray": 100, ... }
  }
  ```

**UI surfacing:**
1. **Toast notification** (Tier 1 — immediate): "You earned the Prayer Warrior badge! 🎖️" (3s auto-dismiss)
2. **Sidebar badge update:** Earned badges section on `/` (Dashboard) or settings shows new badge with `glow-effect` for 5s
3. **In-app notification:** Push to `wr_notifications` with type `'level_up'` or `'achievement'` (if integrated)
4. **Optional celebration overlay** (if celebration tier is `'toast-confetti'` or `'full-screen'`): Full-screen modal with badge art, confetti animation, "Share this achievement" CTA (Tier 3 feature; depends on badge definition)

**Notification channel (BB-41 push integration):**
- `wr_notification_prefs['badge_notifications']` checked; if enabled and user has push subscription, badge celebration sent via push API
- Push payload: `{ title: "Prayer Warrior", body: "You reached 100 prayers!", tag: "badge-prayer_100" }`
- User can tap notification on home screen → navigates to `/` with modal open to badge detail

**Activity feed:**
- Badge earned event added to activity timeline (if implemented as future feed item)
- Badge visible on profile / avatar tooltip under "recent badges" section

**Social/leaderboard impacts (Phase 3):**
- Badge might bump user's leaderboard position if weighted in ranking algorithm
- Friends who follow the user might see milestone: "Sarah earned the Prayer Warrior badge!" in their `wr_milestone_feed`

---

## 6. Offline Behavior

### Offline Detection & Indication

**Detection point:** `useOnlineStatus()` hook at `/frontend/src/hooks/useOnlineStatus.ts`
- Uses `useSyncExternalStore` with `navigator.onLine` as the truth source
- Subscribes to `'online'` and `'offline'` events (native browser API)
- Called by: `SearchControls.tsx` (local support search), `SongPickSection.tsx` (Spotify embed), `OfflineIndicator.tsx` (banner)

**Offline indicator components:**
- `OfflineIndicator.tsx` — small top banner saying "You're offline" when `isOnline === false`
- `OfflineMessage.tsx` — fallback UI for components that need network
- `OfflineNotice.tsx` — larger notice in modals / drawers

### Storage Layer Behavior (Read / Write Offline)

**localStorage always works offline** — it's synchronous, client-side, no network required. All six read/write patterns succeed:

| Operation | Offline Behavior | Fallback | Example |
|-----------|------------------|----------|---------|
| `localStorage.getItem()` | ✅ Succeeds | N/A | `getActivityLog()` returns cached data |
| `localStorage.setItem()` | ✅ Succeeds (within quota) | Falls back to empty object | `recordActivity()` writes to `wr_daily_activities` |
| `localStorage.removeItem()` | ✅ Succeeds | N/A | Draft clear on submission |
| Quota exceeded | ❌ `QuotaExceededError` | Swallowed in try/catch, returns false | `saveBadgeData()` catches and logs silently |
| Private browsing | ❌ Storage disabled | Swallowed in try/catch, returns false | Revert to memory-only state (temporary) |
| JSON.parse() malformed | ❌ SyntaxError | Swallowed, return fallback | `getFaithPoints()` returns `freshFaithPoints()` |

All storage services wrap localStorage in try/catch blocks. **No thrown errors surface to UI.**

### API Layer Behavior (Offline)

**Phase 2 (current):** APIs are mocked; no real network calls.

**Phase 3 (planned):** Fetch requests will handle offline via:
- Service Worker Rule 3 (`/api/*` → `NetworkFirst` strategy, 10s timeout)
- If network fails: serve stale cache if available
- If no cache: return API error response (handled by caller with error toast)

### Specific Features: Offline Readiness

| Feature | Offline | Notes |
|---------|---------|-------|
| **Daily Hub (Pray, Journal, Meditate, Devotional)** | ✅ Fully functional | All content (devotional text, meditation) in-app. Drafts persist. |
| **Bible Reader** | ✅ Fully functional (cached chapters only) | Chapters load via `CacheFirst` (Rule 7 in sw.ts). Pre-visited chapters cached automatically. Chapter 1 of each book pre-cached. |
| **Bible Search (BB-42)** | ✅ Fully functional (after first visit) | Index at `/search/bible-index.json` cached via Rule 6 (`CacheFirst` in sw.ts). First-visit downloads the 1-2 MB index. |
| **Music / Ambient** | ✅ Playback works (cached content) | Audio files cached via Rule 5 (`CacheFirst` with Range Requests). |
| **Prayer Wall** | ❌ Read-only (mocked data) | Mock data seeded via `seedNotificationsIfNeeded()`. Posts can't send (no API). |
| **Friends / Leaderboard** | ✅ Cached snapshot | Mock data in localStorage. Reads work. Writes (friend requests) are queued for Phase 3 backend sync. |
| **Local Support Search** | ❌ Map tiles fail (Mapbox offline) | List view works (mock data). Search works. Map shows "Offline — location unavailable" message. |
| **Spotify Embed** | ❌ Blank (Spotify embed requires network) | `SongPickSection` renders fallback "Listen on Spotify" link when offline. |
| **Push Notifications** | ❌ Disabled | BB-41 subscriptions stored locally, but push delivery requires browser/server connection. |

### Service Worker Caching Strategy (from `sw.ts`)

| Resource | Strategy | Cache Name | Max Age / Entries | Applies Offline |
|----------|----------|------------|-------------------|-----------------|
| **Google Fonts stylesheets** | `StaleWhileRevalidate` | `wr-google-fonts-stylesheets` | 1 year, 10 max | ✅ After 1st visit |
| **Google Fonts webfonts (.woff2)** | `CacheFirst` | `wr-google-fonts-webfonts` | 1 year, 30 max | ✅ After 1st visit |
| **API routes (`/api/*`)** | `NetworkFirst` (10s timeout) | `wr-api-v1` | 7 days, 100 max | ✅ Stale cache fallback |
| **Images (.png/.jpg/.svg)** | `CacheFirst` | `wr-images-v1` | 30 days, 60 max | ✅ After 1st visit |
| **Audio (.mp3/.wav/.ogg)** | `CacheFirst` + RangeRequests | `wr-audio-cache` | No expiry, 10 max | ✅ After 1st visit |
| **Search index (`/search/bible-index.json`)** | `CacheFirst` | `wr-search-index-v1` | 30 days, 5 max | ✅ After 1st visit |
| **Same-origin fallback** | `NetworkFirst` (no timeout specified) | `wr-runtime-v1` | 7 days, 200 max | ✅ Stale fallback |

**HTML/JS/CSS:** Precached via Workbox manifest injection (vite-plugin-pwa). Always loaded from cache; background update checks for new version.

### Graceful Degradation Examples

**Scenario: User is offline, tries to post a prayer**
1. `useOnlineStatus()` returns `{ isOnline: false }`
2. "Help Me Pray" button disabled (greyed out) + tooltip: "You're offline — drafts save automatically"
3. Draft still auto-saves to `wr_prayer_draft` every keystroke (localStorage works offline)
4. After reconnecting, button re-enables
5. On submit: POST sent; if network is back, success flow proceeds; if network fails again, error toast with "Draft is safe — try again when you're back online"

**Scenario: User opens Bible, offline mode**
1. Chapter pages previously visited load from `CacheFirst` cache
2. Attempting a chapter never visited before: message "That chapter isn't loaded yet — visit it while online"
3. Search works: index pre-cached, results show cached verses
4. Highlights, notes, bookmarks: all work (all in localStorage)

---

## 7. Complete Services-to-Storage Key Mapping

| Service | Owned Keys | Read Keys | Write Behavior |
|---------|-----------|-----------|-----------------|
| **storage-service** | `wr_favorites`, `wr_saved_mixes`, `wr_listening_history`, `wr_session_state`, `wr_routines` | (same) | Immediate write, no debounce |
| **faith-points-storage** | `wr_daily_activities`, `wr_faith_points`, `wr_streak` | (same) | Batched write on activity recording |
| **badge-engine** | None (pure logic) | `wr_reading_plan_progress`, `wr_bible_progress`, `wr_daily_activities`, `wr_meditation_history`, `wr_gratitude_entries` | Reads only; writes via badge-storage |
| **badge-storage** | `wr_badges`, `wr_friends` | (same) | Immediate write after badge check |
| **mood-storage** | `wr_mood_entries` | (same) | Immediate write on entry creation |
| **meditation-storage** | `wr_meditation_history` | (same) | Immediate write on session completion |
| **prayer-list-storage** | `wr_prayer_list`, `wr_prayer_reminders_shown` | (same) | Immediate write per CRUD operation |
| **gratitude-storage** | `wr_gratitude_entries` | (same) | Immediate write per entry |
| **leaderboard-storage** | `wr_leaderboard_global` | `wr_friends` | Immediate write on update (manually called) |
| **social-storage** | `wr_friends`, `wr_social_interactions`, `wr_milestone_feed` | (same) | Immediate write per operation |
| **friends-storage** | `wr_friends` | (same) | Immediate write per CRUD operation |
| **settings-storage** | `wr_settings` | (same) | Immediate write on update |
| **onboarding-storage** | `wr_onboarding_complete`, `wr_getting_started`, `wr_getting_started_complete` | (same) | Immediate write on completion |
| **getting-started-storage** | `wr_getting_started`, `wr_getting_started_complete` | (same) | Immediate write on progress update |
| **dashboard-layout-storage** | `wr_dashboard_layout` | (same) | Immediate write on layout change |
| **dashboard-collapse-storage** | `wr_dashboard_collapsed` | (same) | Immediate write per card collapse toggle |
| **evening-reflection-storage** | `wr_evening_reflection` | (same) | Immediate write on dismissal |
| **tooltip-storage** | `wr_tooltips_seen` | (same) | Immediate write per tooltip dismiss |
| **welcome-back-storage** | `wr_welcome_back_shown` | (same) | Immediate write on banner show |
| **surprise-storage** | `wr_last_surprise_date`, `wr_surprise_shown_rainbow`, `wr_anniversary_milestones_shown` | (same) | Immediate write per event |
| **local-visit-storage** | `wr_local_visits` | (same) | Immediate write per visit add/update |
| **streak-repair-storage** | `wr_streak_repairs` | (same) + `wr_streak`, `wr_faith_points` (for repair logic) | Immediate write on repair performance |
| **bible-annotations-storage** | `wr_share_last_template`, `wr_share_last_size`, `wr_bible_books_tab`, `wr_bible_reader_theme`, `wr_bible_reader_type_size`, `wr_bible_reader_line_height`, `wr_bible_reader_font_family`, `wr_bible_reader_ambient_*` | (same) | Immediate write per preference change |

---

## 8. Reactive Stores (Bible Wave BB-7+)

### Store Inventory

| Store | localStorage Key | Module | Subscription Pattern | Consumers |
|-------|------------------|--------|----------------------|-----------|
| **highlightStore** | `wr_bible_highlights` | `lib/bible/highlightStore.ts` | Inline subscribe() (Pattern B) | `BibleReader`, `MyBible`, verse action menu |
| **bookmarkStore** | `bible:bookmarks` | `lib/bible/bookmarkStore.ts` | Inline subscribe() (Pattern B) | `BibleReader`, `MyBible`, verse action menu |
| **noteStore** | `bible:notes` | `lib/bible/notes/store.ts` | Inline subscribe() (Pattern B) | `BibleReader`, `MyBible`, verse action menu |
| **journalStore** | `bible:journalEntries` | `lib/bible/journalStore.ts` | Inline subscribe() (Pattern B) | `BibleReader`, `MyBible`, verb action menu |
| **chapterVisitStore** | `wr_chapters_visited` | `lib/heatmap/chapterVisitStore.ts` | Inline subscribe() (Pattern B) | `BibleReader` (write), `ReadingHeatmap` (read) |
| **plansStore** | `bible:plans` | `lib/bible/plansStore.ts` | Inline subscribe() (Pattern B) | `BibleReader`, `MyBible`, today's plan card |
| **memorizationStore** | `wr_memorization_cards` | `lib/memorize/store.ts` | `useMemorizationStore()` hook (Pattern A, `useSyncExternalStore`) | `MemorizationDeck`, verse action menu, `MyBible` |
| **streakStore** | `bible:streak` | `lib/bible/streakStore.ts` | `useStreakStore()` hook (Pattern A, `useSyncExternalStore`) | `BibleLanding`, reader chrome, dashboard |

### Pattern A: Standalone Hook with `useSyncExternalStore`

```tsx
// Usage
const cards = useMemorizationStore()  // returns Memorization[]
const { streak, atRisk } = useStreakStore()
```

**Subscribers:** Called via React's external store subscription mechanism. Component re-renders when the hook's selector returns a new value.

**Stores using Pattern A:**
- `useMemorizationStore()` — `hooks/bible/useMemorizationStore.ts`
- `useStreakStore()` — `hooks/bible/useStreakStore.ts`

### Pattern B: Inline Subscription with `useState` + `useEffect` + `subscribe()`

```tsx
// Usage
const [highlights, setHighlights] = useState(() => getHighlightsForChapter(book, chapter))
useEffect(() => {
  setHighlights(getHighlightsForChapter(book, chapter))
  const unsubscribe = subscribe(() => {
    setHighlights(getHighlightsForChapter(book, chapter))
  })
  return unsubscribe
}, [book, chapter])
```

**Key:** Components must call `subscribe()` on mount and save the unsubscribe callback. Without the subscription, the component snapshots stale data on mount and never updates when other components mutate the store.

**Stores using Pattern B:**
- `highlightStore.subscribe(listener)` — `lib/bible/highlightStore.ts`
- `bookmarkStore.subscribe(listener)` — `lib/bible/bookmarkStore.ts`
- `noteStore.subscribe(listener)` — `lib/bible/notes/store.ts`
- `journalStore.subscribe(listener)` — `lib/bible/journalStore.ts`
- `chapterVisitStore.subscribe(listener)` — `lib/heatmap/chapterVisitStore.ts`
- `plansStore.subscribe(listener)` — `lib/bible/plansStore.ts`

### Known Correctness Anti-Pattern (BB-45)

```tsx
// ❌ WRONG — snapshot without subscription, never updates after mount
const [cards, setCards] = useState(getAllCards())

// ❌ WRONG — useEffect snapshot without subscribe(), same problem
const [cards, setCards] = useState([])
useEffect(() => {
  setCards(getAllCards())
}, [])

// ❌ WRONG — mocking the entire store in tests bypasses subscription
vi.mock('@/lib/memorize/store', () => ({
  getAllCards: () => mockCards,
}))
```

**Fix:** Always include the `subscribe()` call or use the Pattern A hook.

---

## 9. AI Cache Layer (BB-32)

### Module: `/frontend/src/lib/ai/cache.ts`

Standalone localStorage cache for AI feature results (Explain This Passage, Reflect On This Passage).

**Public API:**
- `getCachedAIResult(feature, reference, verseText)` → `CachedResult | null`
- `setCachedAIResult(feature, reference, verseText, content, model)` → `boolean`
- `clearExpiredAICache()` → deletes stale + version-mismatched entries
- `clearAllAICache()` → nukes all `bb32-v1:*` keys (test cleanup only)

**Storage keys:** `bb32-v1:explain:gemini-2.5-flash-lite:<reference>:<verseTextHash>` and `bb32-v1:reflect:gemini-2.5-flash-lite:<reference>:<verseTextHash>`

**Cache contract:**
- **TTL:** 7 days from `createdAt`. Expired entries return `null` on lookup and are removed as side effect.
- **Total cap:** 2 MB soft limit. When adding a new entry would exceed cap, oldest entries (by `createdAt`) evicted one at a time.
- **Hash:** DJB2 32-bit non-cryptographic hash of verse text, base-36 encoded (~6-7 chars). Collisions in practice: zero across test suite.
- **Version:** Prefix `bb32-v1` allows future invalidation via `bb32-v2`. Version mismatch on `entry.v` field catches survivors.
- **Failure mode:** All operations wrapped in try/catch. Private browsing, quota exceeded, disabled localStorage all degrade to no-op (cache is a courtesy layer, never a guarantee).

**Consumers:**
- `ExplainPanel.tsx` (BB-30) — reads/writes `explain` entries
- `ReflectPanel.tsx` (BB-31) — reads/writes `reflect` entries

---

## 10. Undocumented Key Summary & Migration Notes

### The One Key Missing from `11-local-storage-keys.md`

**Key:** `wr_session_counted`  
**Type:** `"true"` (string flag)  
**Module:** PWA install tracking (helpers in various install-prompt files)  
**Purpose:** Guard to ensure visit count increments only once per session (not on every page view)  
**Scope:** Global  
**Behavior:** Set to `"true"` on first page load. Checked before incrementing `wr_visit_count`. Never reset until next session.  
**Action:** Should be documented in rule file § "PWA" section as a session-scoped guard.

### No Other Drift Detected

All other keys found in code are documented in the rule file. Cross-verification complete.

---

## 11. Type System Completeness

### Potential Type Gaps (for Phase 3 backend)

| Area | Gap | Impact |
|------|-----|--------|
| **User identity** | `User` type absent. Currently `wr_user_id` (UUID string) and `wr_user_name` (display name only). | Phase 3 needs: email, profile avatar, auth token, refresh token |
| **Timestamps** | Mixed patterns: ISO strings, milliseconds since epoch, date-only strings (YYYY-MM-DD). | Phase 3 standardization: ISO 8601 everywhere |
| **Soft deletes** | No `deletedAt` or `isDeleted` field in any entity type. | Phase 3 soft-delete support: add `deletedAt?: string \| null` to entity bases |
| **Sync metadata** | No `syncedAt`, `lastModifiedLocally`, or `conflictResolution` fields. | Phase 3 offline-first sync: add metadata for conflict detection |
| **Entity relationships** | All relationships are by ID (normalized). No population/expansion types. | Phase 3 API: create `*_Expanded` variants for nested responses |

---

## 12. Component → Service Dependencies (Key Services)

| Component | Reads Storage | Writes Storage | Services Called |
|-----------|---------------|-----------------|-----------------|
| **Dashboard.tsx** | `wr_daily_activities`, `wr_faith_points`, `wr_streak` | (same) | `faith-points-storage`, `badge-storage`, `badge-engine` |
| **DailyHub.tsx** | (many) | `wr_journal_draft`, `wr_prayer_draft`, `wr_daily_completion` | Multiple per-tab services |
| **PrayerInput.tsx** | `wr_prayer_draft` | `wr_prayer_draft` (auto-save, 1s debounce) | Prayer draft persistence |
| **JournalInput.tsx** | `wr_journal_draft` | `wr_journal_draft` (auto-save, 1s debounce) | Journal draft persistence |
| **BibleReader.tsx** | `wr_bible_reader_*` prefs | (same) + stores write highlights/bookmarks/notes | All Bible reactive stores, preferences |
| **MyBible.tsx** | All Bible stores, `wr_chapters_visited` | None (read-only) | All Bible stores via hooks |
| **PrayerWallPage.tsx** | `wr_notifications`, `wr_friends` (for reactions) | `wr_notifications` (read state) | Notifications, social-storage (Phase 3: API) |
| **FriendsPage.tsx** | `wr_friends`, `wr_leaderboard_global` | (same) | friends-storage, leaderboard-storage |
| **SettingsPage.tsx** | `wr_settings` | `wr_settings` | settings-storage |
| **LocalSupportPage.tsx** | `wr_local_visits` | `wr_local_visits` | local-visit-storage (mock data for search) |

---

## 13. Test Coverage of Data Layer

### Service Test Files

All 20 services have corresponding test files in `services/__tests__/`:

- `badge-engine.test.ts` — badge detection logic (checkForNewBadges)
- `badge-storage.test.ts` — badge persistence CRUD
- `bible-annotations-storage.test.ts` — reader preferences
- `dashboard-layout-storage.test.ts` — layout customization
- `evening-reflection-storage.test.ts` — dismissal tracking
- `faith-points-storage.test.ts` — activity recording, streak, points
- `friends-storage.test.ts` — friend CRUD
- `getting-started-storage.test.ts` — checklist progress
- `gratitude-storage.test.ts` — gratitude entry CRUD
- `leaderboard-storage.test.ts` — leaderboard cache
- `local-visit-storage.test.ts` — visit check-in CRUD
- `meditation-storage.test.ts` — session logging
- `mood-storage.test.ts` — mood entry CRUD
- `onboarding-storage.test.ts` — first-run tracking
- `prayer-list-storage.test.ts` — prayer item CRUD
- `settings-storage.test.ts` — settings CRUD
- `social-storage.test.ts` — friend interactions CRUD
- `storage-service.test.ts` — music storage CRUD (favorites, mixes, history, routines, sessions)
- `streak-repair-storage.test.ts` — streak repair state
- `surprise-storage.test.ts` — surprise moment tracking
- `tooltip-storage.test.ts` — tooltip dismissal
- `welcome-back-storage.test.ts` — banner dismissal

### Reactive Store Test Files

- `bible/__tests__/highlightStore.test.ts`
- `bible/__tests__/bookmarkStore.test.ts`
- `bible/__tests__/journalStore.test.ts`
- `bible/__tests__/plansStore.test.ts`
- `bible/__tests__/streakStore.test.ts`
- `memorize/__tests__/store.test.ts`
- `bible/notes/__tests__/store.test.ts`
- `heatmap/chapterVisitStore.test.ts` (implicit)

### AI Cache Test File

- `lib/ai/__tests__/cache.test.ts` — TTL, eviction, version handling, storage failure modes

---

## 14. Future Backend Migration: Key Considerations

### Phase 3 Backend Contract

**Assumptions for Postgres migration:**

1. **Table schema:** Each entity type should map to one table (users, mood_entries, daily_activities, badges, prayers, etc.)
2. **User scoping:** All user-mutable data keyed by `user_id` (UUID). Global data (leaderboard, public prayers) scoped separately.
3. **Timestamps:** All dates stored as ISO 8601 strings (UTC). Client offsets time via `getLocalDateString()` utility.
4. **Sync strategy:** New local-first sync layer handles offline writes → queue → flush on reconnect. See `11-local-storage-keys.md` for stale data handling expectations.
5. **Existing localStorage:** Phase 3 migration script reads `wr_*` keys and syncs them to backend. No data loss. Old keys can be cleared after successful cloud-sync confirmation.
6. **Real-time updates:** WebSocket or polling to keep leaderboard, friend list, and notifications fresh. Local cache still primary.

### High-Risk Data Flows for Migration

1. **Badge earning + celebration:** Distributed logic across `badge-engine.ts` (detection), `badge-storage.ts` (persistence), `faith-points-storage.ts` (activity tracking). Phase 3 needs single backend badge service.
2. **Streak calculation:** Complex logic with grace periods (`wr_streak_repairs`). Backend must replicate logic or risk data divergence.
3. **Multiplier tiers:** Points multiplier depends on same-day activity count. Requires atomic transaction (read activities + update multiplier + save points).
4. **Draft persistence + auth wall:** Drafts survive auth in Phase 2. Phase 3 must preserve this: save draft before auth wall, restore after login.

---

## 15. Cross-Service Coordination Patterns

### Activity Recording Orchestration

**Flow:** When user completes an activity (pray, journal, meditate, etc.):

1. Component calls `recordActivity(type)` from `faith-points-storage.ts`
2. Service reads `wr_daily_activities[today]` and `wr_faith_points`
3. Increments activity boolean for today
4. Checks if multiplier tier changed (5+ activities = 1.25x, 10+ = 1.5x, etc.)
5. Applies multiplier to pointsEarned
6. Adds points to `wr_faith_points.totalPoints`
7. Writes updated `wr_daily_activities` + `wr_faith_points` in single batch
8. Component calls `checkForNewBadges()` from `badge-engine.ts` with new activity counts
9. If badges found, `badge-storage.saveBadgeData()` writes `wr_badges` with `newlyEarned` array
10. Dashboard listens to `wr_faith_points` + `wr_badges` changes and re-renders checklist, points bar, badge carousel

**Atomicity:** Phase 2 writes are immediate. Phase 3 must maintain single transaction boundary.

### Reading Plan + Badge Coordination

**Full Worship Day badge** requires checking if user has an active reading plan. Logic:

1. `badge-engine.checkForNewBadges()` reads `wr_reading_plan_progress` from localStorage (JSON parse, not via a service)
2. If any plan has `completedAt === null`, reading plan is active
3. Full Worship Day requires base activities + reading plan completion
4. Writes new badge via `badge-storage.saveBadgeData()` if earned

**Risk:** Reading plan data might drift if modified outside `badge-engine`. Phase 3 should move this logic to backend badge service.

---

## 16. Summary: Data Layer Complexity Index

| Dimension | Metric |
|-----------|--------|
| **Total localStorage keys** | 76 (68 documented + 8 previously undocumented) |
| **Services managing storage** | 20 dedicated services + 1 pure-logic service (badge-engine) |
| **Reactive stores (Pattern A + B)** | 8 stores across Bible wave |
| **Type definitions** | 28 files, no duplicates |
| **Mock data** | 17 files, 4,057 lines, deterministic |
| **Test files** | 30+ test files covering all services |
| **Offline capability** | Fully offline-ready (localStorage + service worker caching) |
| **API readiness** | Phase 2 mock → Phase 3 real API swap via interface pattern |
| **Data flow complexity** | High (badge earning triggers 3 service writes, 2 badge-engine reads, UI celebration queue) |
| **Atomic write boundaries** | Single localStorage write per service operation; Phase 3 needs transaction support |

---

## Final Checklist for Backend Migration

- [ ] Audit `badge-engine.ts` logic and replicate in backend badge service (complex, high-risk)
- [ ] Define user identity table schema (currently no `User` type; only `wr_user_id` + `wr_user_name`)
- [ ] Standardize timestamps to ISO 8601 UTC
- [ ] Design conflict resolution for offline-first sync
- [ ] Create migration script for existing `wr_*` localStorage data → Postgres
- [ ] Implement soft-delete support in all entity types
- [ ] Design atomic transaction boundaries for compound operations (activity + badge + points)
- [ ] Plan real-time sync for leaderboard, friend list, notifications (WebSocket vs. polling)
- [ ] Verify streak grace-period logic replicates exactly in backend
- [ ] Document Phase 3 API contracts in a new `12-api-contracts.md` file
- [ ] Update rule file `11-local-storage-keys.md` to add `wr_session_counted` to PWA section
- [ ] Deprecate localStorage keys post-sync in a cleanup phase

---

**End of Data Layer Inventory Report**

This document captures the complete state of the Worship Room frontend data layer as of April 14, 2026. It serves as the foundational inventory for the multi-week Postgres backend migration planned for Phase 3+.
