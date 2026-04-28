## localStorage Key Inventory

Most keys use the `wr_` prefix. Bible redesign keys use `bible:`. AI cache uses `bb32-v1:`. Data persists across page refreshes and survives logout (except auth keys).

**Prefix conventions:**

- `wr_*` — canonical Worship Room prefix for almost all storage. Used by every feature predating the Bible redesign and most features added during it.
- `bible:*` — Bible redesign personal-layer stores (bookmarks, notes, journals, plans). Documented intentional drift from the older `wr_bible_*` keys.
- `bb32-v1:*` — AI cache module (BB-32) only. The `v1` suffix supports future cache invalidation by version bump.

When adding a new key, default to `wr_*` unless there is a specific reason to use one of the other prefixes. Document any new key in this file before merging.
 
### Auth Keys (cleared on logout)
 
| Key                 | Type        | Feature                                                                                                                                                                                                                                                                                                                                             |
| ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_auth_simulated` | "true"/null | Legacy simulated-auth toggle (pre-JWT). Read by `ListenTracker`, `useFaithPoints`, activity engine, and AuthContext's `readInitialState` fallback. Post-1.9, AuthContext writes it via `simulateLegacyAuth(name)` (mock onboarding) and `mirrorToLegacyKeys(user)` (real JWT login — transitional).                                          |
| `wr_user_name`      | string      | Display name. Post-1.9, mirrored to `user.displayName` for JWT-authed users until Phase 2 cutover removes the mirror.                                                                                                                                                                                                                         |
| `wr_user_id`        | UUID        | User identifier (preserved across logout). Pre-1.9: client-generated via `crypto.randomUUID()`. Post-1.9: mirrored to backend UUID via `mirrorToLegacyKeys`. Data keyed on this value (e.g., `useFriends.getOrInitFriendsData(user.id)`) appears orphaned when transitioning from mock to real auth — see Spec 1.9 Decision 19. |
| `wr_jwt_token`      | string      | Bearer token for authenticated API calls (1.9). 1-hour expiry per backend Spec 1.4. Cleared on explicit logout and on any 401 via `wr:auth-invalidated` window event. **Single source of truth:** `frontend/src/lib/auth-storage.ts` — do not reference this string anywhere else.                   |

**Legacy fallback ordering (1.9):** `readInitialState` checks: (1) `wr_jwt_token` → real JWT mode (boot fetches `/users/me`); (2) `wr_auth_simulated === 'true'` → legacy mock mode (reads `wr_user_name`, `wr_user_id`); (3) unauthenticated. Legacy path preserved for ~32 test files seeding via `wr_auth_simulated`. Future test-migration spec removes it.

**Transitional mirror (1.9, removed in Phase 2):** `mirrorToLegacyKeys(user)` writes `wr_auth_simulated`, `wr_user_name`, `wr_user_id` on login, register auto-login, and boot hydration. Each call site is tagged with `// Transitional — removed in Phase 2 cutover` for grep-and-remove during the Phase 2 migration.
 
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
| `wr_activity_backfill_completed` | "true"/null          | Spec 2.10 one-time idempotent flag — set by `useFaithPoints.recordActivity` after `POST /api/v1/activity/backfill` returns 200. When `'true'`, the dual-write block skips the backfill trigger. Preserved across logout (per-browser, not per-user) so re-login does not re-fire backfill. |
 
### Social & Friends
 
| Key                      | Type                      | Feature                                       |
| ------------------------ | ------------------------- | --------------------------------------------- |
| `wr_friends`             | FriendsData               | Friends list, pending requests, blocked users |
| `wr_social_interactions` | SocialInteractionsData    | Encouragements, nudges                        |
| `wr_milestone_feed`      | MilestoneEvent[] (max 50) | Friend milestone events                       |
| `wr_notifications`       | NotificationEntry[]       | All notification types with read state        |
| `wr_leaderboard_global`  | LeaderboardEntry[]        | Global leaderboard data                       |

### Mutes

| Key         | Type      | Feature                                                                                                                          |
| ----------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `wr_mutes`  | MutesData | Asymmetric per-user mute list — `{ muted: string[] }`. Read by `useMutes` hook. Spec 2.5.7. Module: `services/mutes-storage.ts`. |

### Dashboard & UI State
 
| Key                              | Type                 | Feature                                                                                                                                  |
| -------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_settings`                    | UserSettings         | Profile, notifications, privacy, account                                                                                                 |
| `wr_dashboard_collapsed`         | {cardId: bool}       | Dashboard card collapse state                                                                                                            |
| `wr_dashboard_layout`            | DashboardLayout      | Dashboard widget layout/ordering                                                                                                         |
| `wr_seasonal_banner_dismissed_*` | "true"               | Seasonal banner dismissal (per season suffix)                                                                                            |
| `wr_onboarding_complete`         | "true"               | Welcome wizard completed                                                                                                                 |
| `wr_tooltips_seen`               | string[]             | Dismissed tooltip IDs                                                                                                                    |
| `wr_getting_started`             | GettingStartedData   | Getting started checklist progress                                                                                                       |
| `wr_getting_started_complete`    | "true"               | Getting started checklist completed/dismissed                                                                                            |
| `wr_weekly_summary_dismissed`    | string (Monday date) | Weekly summary banner dismissal                                                                                                          |
| `wr_first_run_completed`         | timestamp string     | FirstRunWelcome completion (BB-34) — when set, welcome overlay never shows again. Suppressed on deep-linked routes regardless of value.  |
 
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
 
### Bible Reader
 
| Key                                       | Type                                                                                                                          | Feature                                                                                                                                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_bible_progress`                       | {book: number[]}                                                                                                              | Chapters read per book                                                                                                                                                                                                        |
| `wr_bible_highlights`                     | BibleHighlight[] (max 500)                                                                                                    | Verse highlights (4 colors). **Reactive store (BB-7).** Module: `lib/bible/highlightStore.ts`. Consumers subscribe inline — see "Reactive store consumption" below.                                                            |
| `wr_bible_notes` *(deprecated)*           | BibleNote[] (max 200)                                                                                                         | **DEPRECATED.** Pre-redesign verse notes; replaced by `bible:notes` in BB-8. No longer written; ignored on read. Constant `BIBLE_NOTES_KEY` still exported from `constants/bible.ts` for backward-compat. Will be removed in a future cleanup spec.                            |
| `bible:bookmarks`                         | `Bookmark[]`                                                                                                                  | Verse bookmarks (flat array). **Reactive store (BB-7).** Module: `lib/bible/bookmarkStore.ts`. Consumers subscribe inline — see "Reactive store consumption" below.                                                            |
| `bible:notes`                             | `Note[]`                                                                                                                      | Verse notes — range-based, 10K char limit (BB-8). **Reactive store.** Module: `lib/bible/notes/store.ts`. Consumers subscribe inline — see "Reactive store consumption" below.                                                 |
| `bible:journalEntries`                    | `JournalEntry[]`                                                                                                              | Journal entries — verse-linked and freeform (BB-11b). **Reactive store.** Module: `lib/bible/journalStore.ts`. Consumers subscribe inline — see "Reactive store consumption" below.                                             |
| `wr_bible_last_read`                      | `{ book: string, chapter: number, verse: number, timestamp: number }`                                                         | Resume Reading card — last viewed position (BB-0 reads, BB-4 writes)                                                                                                                                                          |
| `wr_chapters_visited`                     | `Record<string, Array<{ book: string; chapter: number }>>`                                                                    | Per-day chapter visit log for the BB-43 reading heatmap. Key: YYYY-MM-DD date, value: array of visited chapters. Capped at 400 days. Written on chapter mount in BibleReader, read by My Bible heatmap. **Reactive store.** Module: `lib/heatmap/chapterVisitStore.ts`. Consumers subscribe inline — see "Reactive store consumption" below. |
| `wr_bible_active_plans`                   | `Array<{ planId: string, currentDay: number, totalDays: number, planName: string, todayReading: string, startedAt: number }>` | Today's Plan card — active reading plan progress (BB-0 reads, BB-21 writes)                                                                                                                                                   |
| `wr_bible_streak`                         | `{ count: number, lastReadDate: string }`                                                                                     | Reading streak chip — Bible-specific streak count (BB-0 reads, BB-17 writes). Legacy format; `streakStore.ts` auto-migrates to `bible:streak`.                                                                                |
| `bible:streakResetAcknowledged`           | `{ date: string }`                                                                                                            | Streak reset acknowledgment flag (BB-17). Stores `{ date: getTodayLocal() }` when user dismisses the StreakResetWelcome modal on BibleLanding. Prevents the reset notification from re-appearing on the same day.              |
| `wr_bible_books_tab`                      | `'OT' \| 'NT'`                                                                                                                | Books drawer testament tab selection                                                                                                                                                                                          |
| `wr_bible_reader_theme`                   | `'midnight' \| 'parchment' \| 'sepia'`                                                                                        | Reading theme selection (default: midnight)                                                                                                                                                                                   |
| `wr_bible_reader_type_size`               | `'s' \| 'm' \| 'l' \| 'xl'`                                                                                                   | Type size preference (default: m)                                                                                                                                                                                             |
| `wr_bible_reader_line_height`             | `'compact' \| 'normal' \| 'relaxed'`                                                                                          | Line height preference (default: normal)                                                                                                                                                                                      |
| `wr_bible_reader_font_family`             | `'serif' \| 'sans'`                                                                                                           | Font family preference (default: serif)                                                                                                                                                                                       |
| `wr_bible_focus_enabled`                  | `'true' \| 'false'`                                                                                                           | Focus mode enabled (default: false as of BB-50)                                                                                                                                                                               |
| `wr_bible_focus_v2_migrated`              | `'true'`                                                                                                                      | One-time migration flag (BB-51). When absent on `loadSettings()`, legacy `wr_bible_focus_enabled='true'` values are cleared so legacy users get the post-BB-50 default (`false`). Set once per browser; does not track feature state, only migration completion. |
| `wr_bible_focus_delay`                    | `'3000' \| '6000' \| '12000'`                                                                                                 | Focus mode idle delay in ms (default: 6000)                                                                                                                                                                                   |
| `wr_bible_focus_dim_orbs`                 | `'true' \| 'false'`                                                                                                           | Dim orbs during focus (default: true, forward-compatible)                                                                                                                                                                     |
| `wr_bible_drawer_stack`                   | `{ stack: DrawerView[], timestamp: number }`                                                                                  | Drawer view stack persistence (24-hour TTL)                                                                                                                                                                                   |
| `wr_bible_reader_ambient_visible`         | `'true' \| 'false'`                                                                                                           | Show audio control in reader chrome (default: true)                                                                                                                                                                           |
| `wr_bible_reader_ambient_autostart`       | `'true' \| 'false'`                                                                                                           | Auto-start sound on chapter open (default: false)                                                                                                                                                                             |
| `wr_bible_reader_ambient_autostart_sound` | `string \| null`                                                                                                              | Sound ID for auto-start (default: null = last played)                                                                                                                                                                         |
| `wr_bible_reader_ambient_volume`          | `string (number)`                                                                                                             | Last-used reader volume 0-100 (default: 35)                                                                                                                                                                                   |
| `bible:plans`                             | `PlansStoreState`                                                                                                             | Reading plan progress — activePlanSlug + per-plan progress (BB-21)                                                                                                                                                            |
| `wr_memorization_cards`                   | `MemorizationCard[]`                                                                                                          | Verse memorization deck — flip cards with captured verse text (BB-45). **Reactive store via `useMemorizationStore()` hook.** Module: `hooks/bible/useMemorizationStore.ts`.                                                    |
 
### AI Cache (BB-32)

Cache entries for AI features (Explain this passage, Reflect on this passage). Managed by `frontend/src/lib/ai/cache.ts`. Uses the `bb32-v1:` prefix instead of `wr_` because BB-32 entries are namespaced as a self-contained pool managed by the cache module's eviction and version logic — same exception precedent as the `bible:` prefix used by other Bible-redesign storage.

| Key                                                                 | Type                                                                                                  | Feature                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `bb32-v1:explain:gemini-2.5-flash-lite:<reference>:<verseTextHash>` | `{ v: 1, feature: 'explain', model: string, reference: string, content: string, createdAt: number }` | Explain this passage cache (BB-30 + BB-32)    |
| `bb32-v1:reflect:gemini-2.5-flash-lite:<reference>:<verseTextHash>` | `{ v: 1, feature: 'reflect', model: string, reference: string, content: string, createdAt: number }` | Reflect on this passage cache (BB-31 + BB-32) |

**bb*-v1: cache conventions** (canonical for BB-32; BB-26, BB-29, BB-44 follow the same pattern with deltas noted below):
- **TTL:** 7 days from `createdAt`. Expired entries return `null` on lookup and are removed as a side effect.
- **Total cap:** 2 MB soft limit across all `bb32-v1:*` entries. Exceeding the cap evicts oldest by `createdAt` one at a time. A single entry larger than 2 MB silently fails to write.
- **Cleanup:** `clearExpiredAICache()` sweeps expired and version-mismatched entries in one pass. `clearAllAICache()` nukes every `bb32-v1:*` key (used by tests; reserved for a future admin button).
- **Hash:** verse text is hashed via DJB2 (32-bit, base-36 encoded, non-cryptographic) — compact key, collision-free across the 16 BB-30/BB-31 prompt-test passages.
- **Version:** the `bb32-v1` prefix allows future invalidation. Bumping to `bb32-v2` orphans existing entries; the version mismatch on `entry.v` catches survivors.
- **Failure mode:** all cache operations are wrapped in try/catch. Private browsing, quota exceeded, and disabled localStorage degrade to no-op behavior — the cache is a courtesy layer, never a guarantee.
- **Not cached:** error results. Network errors, API errors, safety blocks, timeouts, and key-missing all retry fresh on next call rather than returning stale failures for 7 days.

### Audio Cache (BB-26)

Cache entries for BB-26 Bible audio playback. Managed by `frontend/src/lib/audio/audio-cache.ts`. Uses the `bb26-v1:` prefix.

| Key                   | Type                    | Feature                                                    |
| --------------------- | ----------------------- | ---------------------------------------------------------- |
| `bb26-v1:audioBibles` | `AudioBiblesCacheEntry` | Cached DBP `listAudioBibles()` response (BB-26), 7-day TTL |

Follows `bb*-v1:` cache conventions (see BB-32 above). Deltas:
- **Single key only.** Per-chapter audio URLs live in an in-memory `Map<string, DbpChapterAudio>` keyed by `${filesetId}:${book}:${chapter}` and are NOT persisted — DBP URLs are signed and expire ~15 hours after issue.
- **Cleanup helper:** `clearCachedAudioBibles()` provides explicit cleanup.
- **Stale-while-revalidate:** the `loadAudioBibles()` wrapper falls back to stale cache data if the DBP fetch fails, or rethrows if no cache exists.
- localStorage operations wrapped in `safeLocalStorageGet/Set/Remove` helpers (same try/catch shape as BB-32).

### Bible Audio Auto-Advance (BB-29)

Preference for continuous playback in the Bible audio player. Managed by `frontend/src/lib/audio/continuous-playback.ts`.

| Key                          | Type      | Feature                                                                                     |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `bb29-v1:continuousPlayback` | `boolean` | Continuous playback preference (BB-29). Defaults to `true` when absent or corrupt. No TTL. |

Follows `bb*-v1:` versioning convention (see BB-32 above). This is a preference flag, not a cache, so TTL/cap/eviction don't apply. Deltas:
- **Default:** `true` — anti-pressure design; the feature works for most users without configuration.
- **Read:** loaded once on `AudioPlayerProvider` mount via lazy reducer init; not re-read during the session.
- **Write:** `setContinuousPlayback` action mirrors the new value into reducer state and writes to localStorage synchronously.
- **Corruption fallback:** non-JSON or non-boolean values fall back to `true`.
- **Cross-tab:** not synchronized. Concurrent audio Bible sessions across tabs aren't a real use case.

### Read-Along Preference (BB-44)

Preference for verse highlighting during Bible audio playback. Managed by `frontend/src/lib/audio/read-along.ts`.

| Key                  | Type      | Feature                                                                                 |
| -------------------- | --------- | --------------------------------------------------------------------------------------- |
| `bb44-v1:readAlong`  | `boolean` | Read-along verse highlighting preference (BB-44). Defaults to `true` when absent. No TTL. |

Follows `bb*-v1:` versioning convention (see BB-32 above). Same shape as BB-29. Deltas:
- **Default:** `true` (spec req 19).
- **Read/write:** same lazy-init + sync-write pattern as BB-29.
- **Corruption fallback:** non-JSON or non-boolean values fall back to `true`.

### Community Challenges
 
| Key                        | Type                             | Feature                          |
| -------------------------- | -------------------------------- | -------------------------------- |
| `wr_challenge_progress`    | {challengeId: ChallengeProgress} | Challenge participation tracking |
| `wr_challenge_reminders`   | string[] (challenge IDs)         | Challenge reminder preferences   |
| `wr_challenge_nudge_shown` | string (today's date)            | Challenge nudge daily tracking   |

### Prayer Wall

| Key                   | Type                              | Feature                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wr_prayer_reactions` | `Record<string, PrayerReaction>`  | Prayer Wall reactions — `isPraying` and `isBookmarked` per prayer. **Reactive store (Phase 0.5).** Module: `lib/prayer-wall/reactionsStore.ts`. Hook: `usePrayerReactions()` (Pattern A via `useSyncExternalStore`). Seeded from `getMockReactions()` on first load when storage is empty. In Phase 3 the localStorage adapter swaps for an API adapter without changing the hook surface. |

### AI Bible Chat
 
| Key                | Type           | Feature                               |
| ------------------ | -------------- | ------------------------------------- |
| `wr_chat_feedback` | ChatFeedback[] | Thumbs up/down feedback on AI answers |
 
### Local Support
 
| Key               | Type                   | Feature                          |
| ----------------- | ---------------------- | -------------------------------- |
| `wr_local_visits` | LocalVisit[] (max 500) | "I visited" check-ins with notes |
 
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
 
### Push Notifications (BB-41)
 
| Key                                | Type                   | Feature                                                                                                                                                                              |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wr_push_subscription`             | PushSubscriptionRecord | Push API subscription (endpoint, encryption keys, applicationServerKey, timestamp). Stored locally until a Phase 3 backend spec adds the push server.                               |
| `wr_notification_prefs`            | NotificationPrefs      | User notification preferences (which types are enabled, daily verse delivery time, last-fired dates per type for dedup)                                                              |
| `wr_notification_prompt_dismissed` | `"true"`               | BibleReader contextual prompt once-per-user flag. Set when the user dismisses the "Want a daily verse?" card after a reading session, prevents the prompt from ever appearing again. |
 
---
 
## Reactive Store Consumption (BB-7 onward)
 
Several Bible-wave keys back **reactive stores** rather than plain CRUD services. Each store module exposes a `subscribe(listener)` function that notifies listeners when the store mutates. Components **must subscribe** so they re-render when the store mutates from any surface.
 
Two subscription patterns coexist in the codebase. Both are acceptable for new stores.
 
### Pattern A: Standalone hook with `useSyncExternalStore` (memorization, streak)
 
Some stores have a dedicated hook file that wraps `useSyncExternalStore`. Components import and call the hook directly.
 
```tsx
// CORRECT — standalone hook (useMemorizationStore, useStreakStore)
import { useMemorizationStore } from '@/hooks/bible/useMemorizationStore';
const cards = useMemorizationStore();
```
 
### Pattern B: Inline subscription (highlights, bookmarks, notes, journals, chapter visits, plans)
 
Most stores do not have a standalone hook. Components subscribe inline using `useState` + `useEffect` + the store's `subscribe()` function.
 
```tsx
// CORRECT — inline subscription
import { getHighlightsForChapter, subscribe } from '@/lib/bible/highlightStore';

const [highlights, setHighlights] = useState(() => getHighlightsForChapter(book, chapter));
useEffect(() => {
  // Re-sync on parameter change
  setHighlights(getHighlightsForChapter(book, chapter));
  // Subscribe to future mutations from any surface
  const unsubscribe = subscribe(() => {
    setHighlights(getHighlightsForChapter(book, chapter));
  });
  return unsubscribe;
}, [book, chapter]);
```
 
The critical element is the `subscribe()` call. Without it, the component snapshots the store on mount and never updates when the store is mutated from another component.
 
### The BB-45 anti-pattern (DO NOT DO)
 
```tsx
// WRONG — snapshot without subscription, never updates after mount
const [cards, setCards] = useState(getAllCards());

// WRONG — useEffect snapshot without subscribe(), same problem
const [cards, setCards] = useState([]);
useEffect(() => {
  setCards(getAllCards());
}, []);

// WRONG — mocking the entire store in tests bypasses the subscription mechanism
vi.mock('@/lib/memorize/store', () => ({
  getAllCards: () => mockCards,
}));
```
 
### Why this matters

A memorization card added in BibleReader will not appear in the My Bible feed if the My Bible component uses the snapshot-without-subscription pattern. The component looks correct on initial render and silently breaks when the store mutates from elsewhere. Tests that only check initial render miss this bug class.

The rule: **every component that reads from a reactive store must subscribe to changes** — via standalone hook (Pattern A) or inline `subscribe()` (Pattern B). Tests must verify subscription behavior, not just initial render.

### Why two patterns coexist

Pattern A (`useSyncExternalStore`-based standalone hook) was introduced with `useMemorizationStore` (BB-45) and `useStreakStore` (BB-17) and is the cleanest approach. Pattern B (inline) predates it and is used by the majority of stores. Both correctly subscribe — the difference is ergonomic. New reactive stores should prefer Pattern A; Pattern B is fine when the query depends on component props (e.g., `book`, `chapter`). Extracting standalone hooks for existing Pattern B stores is a future refactor, not a current requirement.
 
### Reactive stores in this file
 
| Storage key             | Store module                            | Subscription pattern                          | Spec   |
| ----------------------- | --------------------------------------- | --------------------------------------------- | ------ |
| `wr_bible_highlights`   | `lib/bible/highlightStore.ts`           | Inline `subscribe()` (Pattern B)              | BB-7   |
| `bible:bookmarks`       | `lib/bible/bookmarkStore.ts`            | Inline `subscribe()` (Pattern B)              | BB-7   |
| `bible:notes`           | `lib/bible/notes/store.ts`              | Inline `subscribe()` (Pattern B)              | BB-8   |
| `bible:journalEntries`  | `lib/bible/journalStore.ts`             | Inline `subscribe()` (Pattern B)              | BB-11b |
| `wr_chapters_visited`   | `lib/heatmap/chapterVisitStore.ts`      | Inline `subscribe()` (Pattern B)              | BB-43  |
| `wr_memorization_cards` | `lib/memorize/store.ts`                 | `useMemorizationStore()` hook (Pattern A)     | BB-45  |
| `bible:streak`          | `lib/bible/streakStore.ts`              | `useStreakStore()` hook (Pattern A)            | BB-17  |
| `bible:plans`           | `lib/bible/plansStore.ts`               | Inline `subscribe()` (Pattern B)              | BB-21  |
| `wr_prayer_reactions`   | `lib/prayer-wall/reactionsStore.ts`     | `usePrayerReactions()` hook (Pattern A)       | Phase 0.5 |
 
**Note on BB-46 echoes:** Echo dismissal persistence (`wr_echo_dismissals`) was considered but deferred. The current echo system uses a session-scoped `Set<string>` inside the `useEcho()` hook (`hooks/useEcho.ts`) — dismissed echoes reset on page reload. If persistent dismissals are needed, implement as a new feature spec with a proper reactive store.
 
When adding a new reactive store, document the store module path and subscription pattern in this file so future consumers know which approach to follow.
 
---
 
## Key naming conventions
 
- New keys default to `wr_*` prefix.
- Use snake_case for the part after the prefix (`wr_first_run_completed`, not `wr_firstRunCompleted`).
- For per-feature dismissal keys, use `wr_<feature>_dismissed` or `wr_<feature>_shown` consistently.
- For per-day tracking, store `YYYY-MM-DD` as the value and check on read.
- For per-user one-time flags, `"true"` is the canonical truthy value (not `"1"`, not `"yes"`).
- Document every new key in this file as part of the spec that introduces it. Specs that add storage keys without documenting them here are incomplete.