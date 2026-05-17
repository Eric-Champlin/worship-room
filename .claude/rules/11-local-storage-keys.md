## localStorage Key Inventory

Most keys use the `wr_` prefix. Bible redesign keys (`bible:*`) and AI/audio cache keys (`bb*-v1:*`) are documented in **[11b-local-storage-keys-bible.md](./11b-local-storage-keys-bible.md)**. Data persists across page refreshes and survives logout (except auth keys).

**Prefix conventions:**

- `wr_*` — canonical Worship Room prefix for almost all storage. Used by every feature predating the Bible redesign and most features added during it.
- `bible:*` — Bible redesign personal-layer stores (bookmarks, notes, journals, plans). Documented intentional drift from the older `wr_bible_*` keys. **See 11b.**
- `bb32-v1:*` / `bb26-v1:*` / `bb29-v1:*` / `bb44-v1:*` — AI cache, audio cache, and Bible-audio preference modules. The `v1` suffix supports future cache invalidation by version bump. **See 11b.**

When adding a new key, default to `wr_*` unless there is a specific reason to use one of the other prefixes. Document any new key in this file (or 11b for Bible/cache keys) before merging.

### Auth Keys (cleared on logout)

| Key                 | Type        | Feature                                                                                                                                                                                                                                                                                                                         |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_auth_simulated` | "true"/null | Legacy simulated-auth toggle (pre-JWT). Read by `ListenTracker`, `useFaithPoints`, activity engine, and AuthContext's `readInitialState` fallback. Post-1.9, AuthContext writes it via `simulateLegacyAuth(name)` (mock onboarding) and `mirrorToLegacyKeys(user)` (real JWT login — transitional).                             |
| `wr_user_name`      | string      | Display name. Post-1.9, mirrored to `user.displayName` for JWT-authed users until Phase 2 cutover removes the mirror.                                                                                                                                                                                                           |
| `wr_user_id`        | UUID        | User identifier (preserved across logout). Pre-1.9: client-generated via `crypto.randomUUID()`. Post-1.9: mirrored to backend UUID via `mirrorToLegacyKeys`. Data keyed on this value (e.g., `useFriends.getOrInitFriendsData(user.id)`) appears orphaned when transitioning from mock to real auth — see Spec 1.9 Decision 19. |
| `wr_jwt_token`      | string      | Bearer token for authenticated API calls (1.9). 1-hour expiry per backend Spec 1.4. Cleared on explicit logout and on any 401 via `wr:auth-invalidated` window event. **Single source of truth:** `frontend/src/lib/auth-storage.ts` — do not reference this string anywhere else.                                              |

**Legacy fallback ordering (1.9):** `readInitialState` checks: (1) `wr_jwt_token` → real JWT mode (boot fetches `/users/me`); (2) `wr_auth_simulated === 'true'` → legacy mock mode (reads `wr_user_name`, `wr_user_id`); (3) unauthenticated. Legacy path preserved for ~32 test files seeding via `wr_auth_simulated`. Future test-migration spec removes it.

**Transitional mirror (1.9, removed in Phase 2):** `mirrorToLegacyKeys(user)` writes `wr_auth_simulated`, `wr_user_name`, `wr_user_id` on login, register auto-login, and boot hydration. Each call site is tagged with `// Transitional — removed in Phase 2 cutover` for grep-and-remove during the Phase 2 migration.

### Mood & Activity Tracking

| Key                              | Type                          | Feature                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wr_mood_entries`                | MoodEntry[] (max 365)         | Morning + evening mood entries                                                                                                                                                                                                                                                             |
| `wr_daily_activities`            | DailyActivityLog              | Per-day activity completion flags + points                                                                                                                                                                                                                                                 |
| `wr_faith_points`                | FaithPointsData               | Cumulative points, current level                                                                                                                                                                                                                                                           |
| `wr_streak`                      | StreakData                    | Current streak, longest streak, last active date                                                                                                                                                                                                                                           |
| `wr_streak_repairs`              | StreakRepairData              | Previous streak, free repair tracking, weekly reset                                                                                                                                                                                                                                        |
| `wr_badges`                      | BadgeData                     | Earned badges with timestamps, activity counters                                                                                                                                                                                                                                           |
| `wr_meditation_history`          | MeditationSession[] (max 365) | Meditation/guided prayer session logs                                                                                                                                                                                                                                                      |
| `wr_evening_reflection`          | string (today's date)         | Evening reflection dismissal tracking                                                                                                                                                                                                                                                      |
| `wr_activity_backfill_completed` | "true"/null                   | Spec 2.10 one-time idempotent flag — set by `useFaithPoints.recordActivity` after `POST /api/v1/activity/backfill` returns 200. When `'true'`, the dual-write block skips the backfill trigger. Preserved across logout (per-browser, not per-user) so re-login does not re-fire backfill. |

### Social & Friends

| Key                      | Type                      | Feature                                       |
| ------------------------ | ------------------------- | --------------------------------------------- |
| `wr_friends`             | FriendsData               | Friends list, pending requests, blocked users |
| `wr_social_interactions` | SocialInteractionsData    | Encouragements, nudges                        |
| `wr_milestone_feed`      | MilestoneEvent[] (max 50) | Friend milestone events                       |
| `wr_notifications`       | NotificationEntry[]       | All notification types with read state        |
| `wr_leaderboard_global`  | LeaderboardEntry[]        | Global leaderboard data                       |

### Mutes

| Key        | Type      | Feature                                                                                                                          |
| ---------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `wr_mutes` | MutesData | Asymmetric per-user mute list — `{ muted: string[] }`. Read by `useMutes` hook. Spec 2.5.7. Module: `services/mutes-storage.ts`. |

### Dashboard & UI State

| Key                              | Type                 | Feature                                                                                                                                 |
| -------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_settings`                    | UserSettings         | Profile, notifications, privacy, prayerWall (Spec 6.1 + 6.3 + **6.4 Watch** + **6.7 Share warning** — `prayerWall.prayerReceiptsVisible` defaults to `true`, `prayerWall.nightMode` defaults to `'auto'`, `prayerWall.watchEnabled` defaults to `'off'` per Gate-G-FAIL-CLOSED-OPT-IN, `prayerWall.dismissedShareWarning` defaults to `false` per Spec 6.7 — once user confirms the testimony-share irreversibility modal, this flips to `true` and subsequent shares skip the modal), account                  |
| `wr_dashboard_collapsed`         | {cardId: bool}       | Dashboard card collapse state                                                                                                           |
| `wr_dashboard_layout`            | DashboardLayout      | Dashboard widget layout/ordering                                                                                                        |
| `wr_seasonal_banner_dismissed_*` | "true"               | Seasonal banner dismissal (per season suffix)                                                                                           |
| `wr_onboarding_complete`         | "true"               | Welcome wizard completed                                                                                                                |
| `wr_tooltips_seen`               | string[]             | Dismissed tooltip IDs                                                                                                                   |
| `wr_getting_started`             | GettingStartedData   | Getting started checklist progress                                                                                                      |
| `wr_getting_started_complete`    | "true"               | Getting started checklist completed/dismissed                                                                                           |
| `wr_weekly_summary_dismissed`    | string (Monday date) | Weekly summary banner dismissal                                                                                                         |
| `wr_first_run_completed`         | timestamp string     | FirstRunWelcome completion (BB-34) — when set, welcome overlay never shows again. Suppressed on deep-linked routes regardless of value. |

### Music & Audio

| Key                        | Type                         | Feature                                    |
| -------------------------- | ---------------------------- | ------------------------------------------ |
| `wr_favorites`             | Favorite[]                   | Favorited sounds/scenes                    |
| `wr_saved_mixes`           | SavedMix[]                   | User-created ambient mixes                 |
| `wr_listening_history`     | ListeningSession[] (max 100) | Audio listening sessions                   |
| `wr_session_state`         | SessionState (24h expiry)    | Audio session persistence                  |
| `wr_routines`              | RoutineDefinition[]          | Custom bedtime routines                    |
| `wr_sound_effects_enabled` | "true"/"false"               | Sound effects toggle                       |
| `wr_music_hint_pill`       | MusicHintState               | Music hint for audio pill (dismissed flag) |
| `wr_music_hint_sound_grid` | MusicHintState               | Music hint for sound grid (dismissed flag) |
| `wr_routine_favorites`     | `string[]` of routine IDs   | Favorited bedtime routine IDs (templates + user routines). Not auth-gated at the service layer — component layer gates writes. Survives logout. |

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
| `wr_share_last_template`    | string                     | Last-used verse share template |
| `wr_share_last_size`        | string                     | Last-used verse share size     |

### Community Challenges

| Key                        | Type                             | Feature                          |
| -------------------------- | -------------------------------- | -------------------------------- |
| `wr_challenge_progress`    | {challengeId: ChallengeProgress} | Challenge participation tracking |
| `wr_challenge_reminders`   | string[] (challenge IDs)         | Challenge reminder preferences   |
| `wr_challenge_nudge_shown` | string (today's date)            | Challenge nudge daily tracking   |

### Prayer Wall

| Key                   | Type                             | Feature                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wr_prayer_reactions` | `Record<string, PrayerReaction>` | Prayer Wall reactions — `isPraying`, `isBookmarked`, `isCandle`, `isPraising`, and `isCelebrating` per prayer (Spec 3.7 added `isCandle`; Spec 6.6 Answered Wall added `isPraising`; Spec 6.6b added `isCelebrating` — the warm sunrise reaction on answered posts, distinct from `isPraising`). **Reactive store (Phase 0.5, extended Spec 3.7 + 6.6 + 6.6b).** Module: `lib/prayer-wall/reactionsStore.ts`. Hook: `usePrayerReactions()` (Pattern A via `useSyncExternalStore`). Seeded from `getMockReactions()` on first load when storage is empty. **Spec 3.7 + 6.6 + 6.6b migration:** old-shape entries missing `isCandle`, `isPraising`, and/or `isCelebrating` are default-filled to `false` on hydrate and written back. No version key required — additive shape with safe `false` defaults makes the migration one-pass and irreversible. **Three-stage migration:** pre-3.7 data (3 fields) default-fills `isCandle` + `isPraising` + `isCelebrating`; post-3.7-pre-6.6 data (4 fields with `isCandle` only) default-fills `isPraising` + `isCelebrating`; post-6.6-pre-6.6b data (5 fields with `isCandle` + `isPraising`) default-fills `isCelebrating`. In Phase 3 (Spec 3.10) the localStorage adapter swaps for an API adapter without changing the hook surface. |
| `wr_prayer_wall_guidelines_dismissed` | `"true"` | Community Guidelines card dismissal flag (Prayer Wall Redesign — 2026-05-13). Set when the user taps "Got it (don't show again)" on the right-sidebar `CommunityGuidelinesCard`. Read on mount; if `"true"`, the card returns `null`. Per-device (not synced), survives logout. Single consumer — plain `localStorage` boolean, not a reactive store. Future spec may migrate to server-backed dual-write settings if per-device persistence proves annoying. |

### AI Bible Chat

| Key                | Type           | Feature                               |
| ------------------ | -------------- | ------------------------------------- |
| `wr_chat_feedback` | ChatFeedback[] | Thumbs up/down feedback on AI answers |

### Local Support

| Key                                                                                                                            | Type                                | Feature                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wr_local_visits`                                                                                                              | LocalVisit[] (max 500)              | "I visited" check-ins with notes                                                                                                                                                                                                                                                   |
| `wr_bookmarks_<category>` (3 variants: `wr_bookmarks_churches`, `wr_bookmarks_counselors`, `wr_bookmarks_celebrate-recovery`) | `string[]` of LocalSupportPlace IDs | Client-side bookmark state for Local Support listings. Persisted only when user is authenticated (logged-out bookmark click opens auth modal — never writes). No eviction (manual user action only). Consumed by `LocalSupportPage.tsx` (read on mount, write on bookmark toggle). |

### PWA

| Key                          | Type      | Feature                                        |
| ---------------------------- | --------- | ---------------------------------------------- |
| `wr_install_dismissed`       | timestamp | Install prompt dismissal                       |
| `wr_install_dashboard_shown` | "true"    | Dashboard install card shown flag              |
| `wr_visit_count`             | number    | Visit count for install prompt timing          |
| `wr_session_counted`         | "true"    | Visit-count increment guard (once per session) |

### Engagement & Surprise Moments

| Key                                | Type                  | Feature                                      |
| ---------------------------------- | --------------------- | -------------------------------------------- |
| `wr_welcome_back_shown`            | string (today's date) | WelcomeBack banner daily dismissal           |
| `wr_midnight_verse_shown`          | string (today's date) | Midnight verse reveal daily tracking         |
| `wr_last_surprise_date`            | string (date)         | Last date a surprise moment fired            |
| `wr_surprise_shown_rainbow`        | "true"                | Rainbow surprise one-time dismissal          |
| `wr_anniversary_milestones_shown`  | number[]              | Fired anniversary milestone celebrations     |
| `wr_gratitude_callback_last_shown` | string (date)         | Gratitude callback toast last-shown tracking |
| `wr_mybible_device_storage_seen`   | `"true"`              | MyBible logged-out device-local-storage banner dismissal flag (Spec 8B). Set when user dismisses the "Your data lives on this device" banner on `/bible/my`. Read on mount; if `"true"`, banner is hidden. Cleared only by user-initiated localStorage clearance — there is no in-app reset. |
| `wr_counselor_bridge_dismissed`    | `"true"` (sessionStorage) | Spec 7.5 — Counselor bridge dismissal flag. Set when the user taps the X on the inline bridge that appears below the category fieldset on InlineComposer when `postType === 'prayer_request' && selectedCategory === 'mental-health'`. Once set, the bridge does NOT re-render in the same session, even if the user toggles the category away and back. Cleared on browser session end (tab close). Module: `services/counselor-bridge-storage.ts` (`shouldShowCounselorBridge` / `markCounselorBridgeDismissed`). Per-device, NOT synced to backend (no backend changes in Spec 7.5). Single consumer per page mount; plain CRUD, not a reactive store. |

### Push Notifications (BB-41)

| Key                                | Type                   | Feature                                                                                                                                                                              |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wr_push_subscription`             | PushSubscriptionRecord | Push API subscription (endpoint, encryption keys, applicationServerKey, timestamp). Stored locally until a Phase 3 backend spec adds the push server.                                |
| `wr_notification_prefs`            | NotificationPrefs      | User notification preferences (which types are enabled, daily verse delivery time, last-fired dates per type for dedup)                                                              |
| `wr_notification_prompt_dismissed` | `"true"`               | BibleReader contextual prompt once-per-user flag. Set when the user dismisses the "Want a daily verse?" card after a reading session, prevents the prompt from ever appearing again. |

### Night Mode (Spec 6.3)

| Key                   | Type             | Feature                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_night_mode_hint`  | `"on"` \| `"off"` | Prayer Wall Night Mode bootstrap hint (Spec 6.3). Written by `useNightMode()` on every reconciliation pass (active-state changes). Read by the inline `index.html` no-FOUC script as a secondary signal — the primary signal is `wr_settings.prayerWall.nightMode` + browser hour, recomputed inline (Plan-Time Divergence #3). Survives logout. The 3-state preference itself lives at `wr_settings.prayerWall.nightMode` (`'auto'` \| `'on'` \| `'off'`, default `'auto'`). |

### Verse-Finds-You (Spec 6.8)

| Key                                | Type                                      | Feature                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_settings.verseFindsYou.enabled` | `boolean` (nested under top-level `verseFindsYou.*` namespace within `wr_settings`) | Verse-Finds-You toggle (Spec 6.8). Defaults to `false` for ALL users (new + existing) via `DEFAULT_SETTINGS.verseFindsYou.enabled = false` + `deepMerge` in `services/settings-storage.ts` (existing-user keys get the new namespace on next load). Single-tap enable/disable in Settings → Gentle extras section — NO confirmation modal (Brief §4: protections are default-off + curation + cooldowns + 24h limit, not a confirmation gate). When `false`, `useVerseFindsYou.trigger(...)` exits before any API call (Gate-G-DEFAULT-OFF / W28 / T-SEC-1). Top-level namespace (NOT nested under `prayerWall.*`) — Verse-Finds-You is a cross-surface feature, not Prayer-Wall-specific. |
| `wr_verse_dismissals`              | `{ count: number, promptShown: boolean }` | Verse-Finds-You 3-in-a-row dismissal tracking (Spec 6.8). `count` increments on each dismissal without intervening engagement; resets to 0 when user engages (does NOT dismiss the surfaced verse OR taps Save). When `count` reaches 3 AND `promptShown` is `false`, the off-ramp prompt surfaces once (page-level, NOT inside `VerseFindsYou.tsx` — see Plan-Time Divergence #8); `promptShown` flips to `true` when user taps either off-ramp button so the prompt never re-fires. Plain localStorage object (not a reactive store — single consumer per page mount). Module: `services/verse-dismissals-storage.ts`. |

### Live Presence (Spec 6.11b)

| Key | Type | Feature |
|-----|------|---------|
| `wr_settings.presence.optedOut` | `boolean` (nested under top-level `presence.*` namespace within `wr_settings`) | Live Presence opt-out toggle (Spec 6.11b). Defaults to `false` for ALL users (new + existing) via `DEFAULT_SETTINGS.presence.optedOut = false` + `deepMerge` in `services/settings-storage.ts` (existing-user keys get the new namespace on next load). Toggle exposed in Settings → Gentle extras section. Top-level namespace (NOT nested under `prayerWall.*`) — Presence is a cross-surface feature; future presence-on-other-surfaces specs share the same toggle. Mirrored to backend via PATCH /users/me `presenceOptedOut` field (fire-and-forget on toggle; localStorage is fast-read, backend is authoritative for the count-exclusion filter). |

### Composer Drafts (Spec 6.9)

| Key                   | Type                                                                                          | Feature                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_composer_drafts`  | `Record<DraftKey, { content: string; updatedAt: number }>` where `DraftKey = PostType \| 'qotd'` | Prayer Wall composer auto-save drafts (Spec 6.9). One draft per `DraftKey`. Auto-save fires every 5 seconds while content is dirty (W1 dirty-flag pattern); restore prompt surfaces on composer reopen if a draft exists and is within 7 days; cleared on successful post submit; cleared on logout. Plain localStorage object — NOT a reactive store (single-consumer-per-key CRUD pattern, matches `verse-dismissals-storage.ts`). Module: `services/composer-drafts-storage.ts`. Hook: `useComposerDraft`. Component: `components/prayer-wall/RestoreDraftPrompt.tsx`. |

Drafts are per-device — there is no userId tagging on the value. Account isolation on a shared device is enforced via `clearAllComposerDrafts()` inside `AuthContext.logout()`. The 7-day TTL is enforced on READ (an expired record is silently removed and `getDraft` returns null); a stale draft never surfaces a restore prompt. The QOTD composer uses the synthetic key `'qotd'` so that QOTD response drafts and `'discussion'` post drafts remain independent despite both submitting as `postType: 'discussion'` on the wire.

---

## Key naming conventions

- New keys default to `wr_*` prefix.
- Use snake_case for the part after the prefix (`wr_first_run_completed`, not `wr_firstRunCompleted`).
- For per-feature dismissal keys, use `wr_<feature>_dismissed` or `wr_<feature>_shown` consistently.
- For per-day tracking, store `YYYY-MM-DD` as the value and check on read.
- For per-user one-time flags, `"true"` is the canonical truthy value (not `"1"`, not `"yes"`).
- Document every new key in this file (or in **[11b-local-storage-keys-bible.md](./11b-local-storage-keys-bible.md)** for Bible-redesign or cache keys) as part of the spec that introduces it. Specs that add storage keys without documenting them are incomplete.

---

> **Bible Reader keys, AI Cache, Audio Cache, Bible-audio preferences, and the Reactive Store Consumption guidance** live in **[11b-local-storage-keys-bible.md](./11b-local-storage-keys-bible.md)**.
