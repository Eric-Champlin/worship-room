## localStorage Key Inventory

Most keys use the `wr_` prefix. Bible redesign keys use the `bible:` prefix instead. Data persists across page refreshes and survives logout (except auth keys).

### Auth Keys (cleared on logout)

| Key                 | Type        | Feature                                   |
| ------------------- | ----------- | ----------------------------------------- |
| `wr_auth_simulated` | "true"/null | Simulated auth toggle                     |
| `wr_user_name`      | string      | Display name                              |
| `wr_user_id`        | UUID        | User identifier (preserved across logout) |

### Mood & Activity Tracking

| Key                     | Type                          | Feature                                             |
| ----------------------- | ----------------------------- | --------------------------------------------------- |
| `wr_mood_entries`       | MoodEntry[] (max 365)         | Morning + evening mood entries                      |
| `wr_daily_activities`   | DailyActivityLog              | Per-day activity completion flags + points          |
| `wr_faith_points`       | FaithPointsData               | Cumulative points, current level                    |
| `wr_streak`             | StreakData                    | Current streak, longest streak, last active date    |
| `wr_streak_repairs`     | StreakRepairData              | Previous streak, free repair tracking, weekly reset |
| `wr_badges`             | BadgeData                     | Earned badges with timestamps, activity counters    |
| `wr_meditation_history` | MeditationSession[] (max 365) | Meditation/guided prayer session logs               |
| `wr_evening_reflection` | string (today's date)         | Evening reflection dismissal tracking               |

### Social & Friends

| Key                      | Type                      | Feature                                       |
| ------------------------ | ------------------------- | --------------------------------------------- |
| `wr_friends`             | FriendsData               | Friends list, pending requests, blocked users |
| `wr_social_interactions` | SocialInteractionsData    | Encouragements, nudges                        |
| `wr_milestone_feed`      | MilestoneEvent[] (max 50) | Friend milestone events                       |
| `wr_notifications`       | NotificationEntry[]       | All notification types with read state        |
| `wr_leaderboard_global`  | LeaderboardEntry[]        | Global leaderboard data                       |

### Dashboard & UI State

| Key                           | Type                 | Feature                                       |
| ----------------------------- | -------------------- | --------------------------------------------- |
| `wr_settings`                 | UserSettings         | Profile, notifications, privacy, account      |
| `wr_dashboard_collapsed`      | {cardId: bool}       | Dashboard card collapse state                 |
| `wr_dashboard_layout`         | DashboardLayout      | Dashboard widget layout/ordering              |
| `wr_seasonal_banner_dismissed_*` | "true"            | Seasonal banner dismissal (per season suffix) |
| `wr_onboarding_complete`      | "true"               | Welcome wizard completed                      |
| `wr_tooltips_seen`            | string[]             | Dismissed tooltip IDs                         |
| `wr_getting_started`          | GettingStartedData   | Getting started checklist progress            |
| `wr_getting_started_complete` | "true"               | Getting started checklist completed/dismissed |
| `wr_weekly_summary_dismissed` | string (Monday date) | Weekly summary banner dismissal               |

### Music & Audio

| Key                    | Type                         | Feature                    |
| ---------------------- | ---------------------------- | -------------------------- |
| `wr_favorites`         | Favorite[]                   | Favorited sounds/scenes    |
| `wr_saved_mixes`       | SavedMix[]                   | User-created ambient mixes |
| `wr_listening_history` | ListeningSession[] (max 100) | Audio listening sessions   |
| `wr_session_state`     | SessionState (24h expiry)    | Audio session persistence  |
| `wr_routines`          | RoutineDefinition[]          | Custom bedtime routines    |
| `wr_sound_effects_enabled` | "true"/"false"           | Sound effects toggle       |
| `wr_music_hint_pill`       | MusicHintState               | Music hint for audio pill (dismissed flag) |
| `wr_music_hint_sound_grid` | MusicHintState               | Music hint for sound grid (dismissed flag) |

### Daily Hub & Journal

| Key                     | Type            | Feature                              |
| ----------------------- | --------------- | ------------------------------------ |
| `wr_daily_completion`   | DailyCompletion | Daily tab completion tracking        |
| `wr_journal_draft`      | string          | Journal draft auto-save              |
| `wr_prayer_draft`       | string          | Prayer textarea draft auto-save      |
| `wr_journal_mode`       | "guided"/"free" | Journal mode preference              |
| `wr_journal_milestones` | number[]        | Fired journal milestone celebrations |

### Content Features

| Key                         | Type                       | Feature                        |
| --------------------------- | -------------------------- | ------------------------------ |
| `wr_devotional_reads`       | string[] (dates, max 365)  | Devotional reading completion  |
| `wr_prayer_list`            | PrayerItem[] (max 200)     | Personal prayer requests       |
| `wr_prayer_reminders_shown` | string (date + IDs)        | Prayer reminder toast tracking |
| `wr_reading_plan_progress`  | {planId: PlanProgress}     | Reading plan daily progress    |
| `wr_custom_plans`           | string[] (plan IDs)        | AI-generated plan references   |
| `wr_gratitude_entries`      | GratitudeEntry[] (max 365) | Daily gratitude items          |
| `wr_share_last_template`   | string                     | Last-used verse share template |
| `wr_share_last_size`       | string                     | Last-used verse share size     |

### Bible Reader

| Key                   | Type                       | Feature                     |
| --------------------- | -------------------------- | --------------------------- |
| `wr_bible_progress`     | {book: number[]}           | Chapters read per book      |
| `wr_bible_highlights`  | BibleHighlight[] (max 500) | Verse highlights (4 colors) |
| `wr_bible_notes`       | BibleNote[] (max 200)      | Personal verse notes (pre-redesign, deprecated by BB-8) |
| `bible:bookmarks`      | `Bookmark[]`               | Verse bookmarks (flat array) |
| `bible:notes`          | `Note[]`                   | Verse notes — range-based, 10K char limit (BB-8) |
| `bible:journalEntries` | `JournalEntry[]`           | Journal entries — verse-linked and freeform (BB-11b) |
| `wr_bible_last_read`   | `{ book: string, chapter: number, verse: number, timestamp: number }` | Resume Reading card — last viewed position (BB-0 reads, BB-4 writes) |
| `wr_chapters_visited`  | `Record<string, Array<{ book: string; chapter: number }>>` | Per-day chapter visit log for heatmap (BB-43). Key: YYYY-MM-DD date, value: array of visited chapters. Capped at 400 days. Written on chapter mount in BibleReader, read by My Bible heatmap. |
| `wr_bible_active_plans` | `Array<{ planId: string, currentDay: number, totalDays: number, planName: string, todayReading: string, startedAt: number }>` | Today's Plan card — active reading plan progress (BB-0 reads, BB-21 writes) |
| `wr_bible_streak`      | `{ count: number, lastReadDate: string }` | Reading streak chip — Bible-specific streak count (BB-0 reads, BB-17 writes) |
| `wr_bible_books_tab`   | `'OT' \| 'NT'`            | Books drawer testament tab selection |
| `wr_bible_reader_theme` | `'midnight' \| 'parchment' \| 'sepia'` | Reading theme selection (default: midnight) |
| `wr_bible_reader_type_size` | `'s' \| 'm' \| 'l' \| 'xl'` | Type size preference (default: m) |
| `wr_bible_reader_line_height` | `'compact' \| 'normal' \| 'relaxed'` | Line height preference (default: normal) |
| `wr_bible_reader_font_family` | `'serif' \| 'sans'` | Font family preference (default: serif) |
| `wr_bible_focus_enabled` | `'true' \| 'false'` | Focus mode enabled (default: true) |
| `wr_bible_focus_delay` | `'3000' \| '6000' \| '12000'` | Focus mode idle delay in ms (default: 6000) |
| `wr_bible_focus_dim_orbs` | `'true' \| 'false'` | Dim orbs during focus (default: true, forward-compatible) |
| `wr_bible_drawer_stack` | `{ stack: DrawerView[], timestamp: number }` | Drawer view stack persistence (24-hour TTL) |
| `wr_bible_reader_ambient_visible` | `'true' \| 'false'` | Show audio control in reader chrome (default: true) |
| `wr_bible_reader_ambient_autostart` | `'true' \| 'false'` | Auto-start sound on chapter open (default: false) |
| `wr_bible_reader_ambient_autostart_sound` | `string \| null` | Sound ID for auto-start (default: null = last played) |
| `wr_bible_reader_ambient_volume` | `string (number)` | Last-used reader volume 0-100 (default: 35) |
| `bible:plans`         | `PlansStoreState`              | Reading plan progress — activePlanSlug + per-plan progress (BB-21) |

### AI Cache (BB-32)

Cache entries for AI features (Explain this passage, Reflect on this passage). Managed by `frontend/src/lib/ai/cache.ts`. Uses the `bb32-v1:` prefix instead of `wr_` because BB-32 entries are namespaced as a self-contained pool managed by the cache module's eviction and version logic — same exception precedent as the `bible:` prefix used by other Bible-redesign storage.

| Key                                                                       | Type                                                                              | Feature                                                               |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `bb32-v1:explain:gemini-2.5-flash-lite:<reference>:<verseTextHash>`       | `{ v: 1, feature: 'explain', model: string, reference: string, content: string, createdAt: number }` | Explain this passage cache (BB-30 + BB-32)                            |
| `bb32-v1:reflect:gemini-2.5-flash-lite:<reference>:<verseTextHash>`       | `{ v: 1, feature: 'reflect', model: string, reference: string, content: string, createdAt: number }` | Reflect on this passage cache (BB-31 + BB-32)                         |

- **TTL:** 7 days from `createdAt`. Expired entries return `null` on lookup and are removed as a side effect.
- **Total cap:** 2 MB (soft limit) across all `bb32-v1:*` entries. When adding a new entry would exceed the cap, oldest entries (by `createdAt`) are evicted one at a time until the cap is satisfied. A single entry larger than 2 MB silently fails to write.
- **Cleanup:** `clearExpiredAICache()` sweeps expired and version-mismatched entries in one pass. `clearAllAICache()` nukes every `bb32-v1:*` key (used by tests and reserved for a future admin button — no UI trigger exists).
- **Hash:** verse text is hashed via DJB2 (32-bit, base-36 encoded, non-cryptographic) — compact enough to keep the key short, collision-free across the 16 BB-30/BB-31 prompt-test passages.
- **Version:** the `bb32-v1` key prefix allows future invalidation. Bumping to `bb32-v2` in a later spec will orphan all existing entries, and the version mismatch on `entry.v` will catch any survivors.
- **Failure mode:** all cache operations are wrapped in try/catch. Private browsing, quota exceeded, and disabled localStorage all degrade to no-op behavior — the cache is a courtesy layer, never a guarantee. Cache failures never propagate to the UI.
- **Not cached:** error results. Network errors, API errors, safety blocks, timeouts, key-missing — retrying after a transient failure should fire a fresh request, not return the old failure for 7 days.

### Community Challenges

| Key                        | Type                             | Feature                          |
| -------------------------- | -------------------------------- | -------------------------------- |
| `wr_challenge_progress`    | {challengeId: ChallengeProgress} | Challenge participation tracking |
| `wr_challenge_reminders`   | string[] (challenge IDs)         | Challenge reminder preferences   |
| `wr_challenge_nudge_shown` | string (today's date)            | Challenge nudge daily tracking   |

### AI Bible Chat

| Key                | Type           | Feature                               |
| ------------------ | -------------- | ------------------------------------- |
| `wr_chat_feedback` | ChatFeedback[] | Thumbs up/down feedback on AI answers |

### Local Support

| Key               | Type                   | Feature                          |
| ----------------- | ---------------------- | -------------------------------- |
| `wr_local_visits` | LocalVisit[] (max 500) | "I visited" check-ins with notes |

### PWA

| Key                         | Type      | Feature                                        |
| --------------------------- | --------- | ---------------------------------------------- |
| `wr_install_dismissed`      | timestamp | Install prompt dismissal                       |
| `wr_install_dashboard_shown`| "true"    | Dashboard install card shown flag              |
| `wr_visit_count`            | number    | Visit count for install prompt timing          |
| `wr_session_counted`        | "true"    | Visit-count increment guard (once per session) |

### Engagement & Surprise Moments

| Key                                | Type                   | Feature                                         |
| ---------------------------------- | ---------------------- | ----------------------------------------------- |
| `wr_welcome_back_shown`            | string (today's date)  | WelcomeBack banner daily dismissal              |
| `wr_midnight_verse_shown`          | string (today's date)  | Midnight verse reveal daily tracking            |
| `wr_last_surprise_date`            | string (date)          | Last date a surprise moment fired               |
| `wr_surprise_shown_rainbow`        | "true"                 | Rainbow surprise one-time dismissal             |
| `wr_anniversary_milestones_shown`  | number[]               | Fired anniversary milestone celebrations        |
| `wr_gratitude_callback_last_shown` | string (date)          | Gratitude callback toast last-shown tracking    |

### Push Notifications (BB-41)

| Key                                | Type                   | Feature                                           |
| ---------------------------------- | ---------------------- | ------------------------------------------------- |
| `wr_push_subscription`             | PushSubscriptionRecord | Push API subscription (endpoint, keys, VAPID key) |
| `wr_notification_prefs`            | NotificationPrefs      | User notification preferences (types, time, last-fired dates) |
| `wr_notification_prompt_dismissed` | `"true"`               | BibleReader contextual prompt once-per-user flag  |
