## localStorage Key Inventory

All keys use the `wr_` prefix (except legacy `worship-room-*` keys). Data persists across page refreshes and survives logout (except auth keys).

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
| `wr_music_hints_*`    | MusicHintState               | Music hints per user (dynamic suffix) |

### Daily Hub & Journal

| Key                             | Type            | Feature                              |
| ------------------------------- | --------------- | ------------------------------------ |
| `worship-room-daily-completion` | DailyCompletion | Daily tab completion tracking        |
| `worship-room-journal-draft`    | string          | Journal draft auto-save              |
| `worship-room-journal-mode`     | "guided"/"free" | Journal mode preference              |
| `wr_journal_milestones`         | number[]        | Fired journal milestone celebrations |

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
| `wr_bible_progress`   | {book: number[]}           | Chapters read per book      |
| `wr_bible_highlights` | BibleHighlight[] (max 500) | Verse highlights (4 colors) |
| `wr_bible_notes`      | BibleNote[] (max 200)      | Personal verse notes        |

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

| Key                    | Type      | Feature                               |
| ---------------------- | --------- | ------------------------------------- |
| `wr_install_dismissed` | timestamp | Install prompt dismissal              |
| `wr_visit_count`       | number    | Visit count for install prompt timing |
