# Forums Wave: Spec 2.4 — Badge Eligibility Service (Backend Port)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 2.4 (line ~2691)
**Branch:** `forums-wave-continued` (stay on this branch — no per-spec sub-branch)
**Date:** 2026-04-26

---

## Affected Frontend Routes

N/A — backend-only spec. No frontend code touched. The `BadgeService` this spec creates will be composed by `POST /api/v1/activity` (Spec 2.6) and exercised end-to-end by Spec 2.7's frontend dual-write wiring; user-facing behavior does not change in this spec.

---

## Spec Header

- **ID:** `round3-phase02-spec04-badge-service`
- **Size:** L
- **Risk:** Medium (complex catalog + 15 eligibility categories; drift here breaks badge celebrations across both implementations)
- **Prerequisites:** 2.1 (Activity Engine Schema) ✅, 2.2 (Faith Points Calculation Service) ✅, 2.3 (Streak State Service) ✅ — `user_badges` table exists per `backend/src/main/resources/db/changelog/2026-04-25-006-create-user-badges-table.xml`; `com.worshiproom.activity` package exists with the `FaithPoints` and `StreakState` entity precedents.
- **Phase:** 2 — Activity Engine Migration (Dual-Write)
- **Fourth spec of Phase 2.** Specs 2.5 (activity counts), 2.6 (HTTP endpoint), 2.7 (frontend dual-write), 2.8 (drift detection) layer on top.

> **Tracker note:** `_forums_master_plan/spec-tracker.md` shows 2.1/2.2/2.3 as ⬜ at the time this spec was authored, but the recent commit history (`f0e5bbe spec-2-3`, `478edfb spec-2-2`, `565d55e spec-2-1`) confirms all three have shipped to `forums-wave-continued`. The tracker is stale; the prerequisites are met. Eric will catch up the tracker manually.

---

## Goal

Port the existing frontend badge catalog and eligibility logic from `frontend/src/services/badge-engine.ts` and `frontend/src/constants/dashboard/badges.ts` to a backend `BadgeService` that produces byte-identical output for identical inputs.

This is a **faithful port, NOT a redesign.** Same 15 eligibility categories, same ~58 badge catalog entries, same celebration tiers, same repeatability rules, same edge cases. If the frontend computes a 7-day-consecutive-gratitude streak via date-set sorting, the backend uses identical date-set sorting.

The eventual consumer is Spec 2.6's `POST /api/v1/activity` endpoint. Spec 2.8's drift-detection test will assert parity across all 15 categories.

---

## Master Plan Divergences

Two meaningful divergences from master plan v2.9 § Spec 2.4 body. Both shape the spec scope significantly.

### Divergence 1 — Backend lacks data for most badge categories

The frontend's `checkForNewBadges` reads from at least seven data sources to evaluate eligibility:

a. `wr_reading_plan_progress` — reading plan completions
b. `wr_bible_progress` — bible chapters/books read
c. `wr_meditation_history` — meditation session list
d. `wr_gratitude_entries` — gratitude entry dates
e. `wr_local_visits` — visited local-support places
f. `wr_listening_history` — listening session durations
g. `wr_friends` — friend count

Plus context-passed values: streak, level, activity counts, today's activities, intercession count.

After Spec 2.1 schema migration, the BACKEND has data only for: streak (`streak_state`), level (`faith_points`), activity counts (`activity_counts`), today's activities (`activity_log`), and post/intercession counts (`activity_counts`).

NONE of (a)–(f) exists on the backend. Friends migration (Phase 2.5) will eventually add (g). The other six data sources will migrate in later phases.

**Resolution:** `BadgeService` is implemented as a **PURE FUNCTION** over an input `BadgeCheckContext` that mirrors the frontend's context shape exactly. The service doesn't query the database. The CALLER (Spec 2.6's controller) assembles the context from whatever data sources it has access to. Categories whose data isn't available yet will have empty/zero/null inputs in the context; the service correctly returns no badges from those categories rather than firing incorrectly.

The SHADOW (backend) computation will under-count badges relative to the frontend during the dual-write phase. This is **EXPECTED** and tolerated by Decision 5's dual-write strategy: "If the backend response disagrees with localStorage (e.g., extra badge from a different device), log a warning to the console but do not surface to user during this wave."

The drift-detection test in Spec 2.8 will feed BOTH implementations identical context (same fake bible progress, same fake meditation history, etc.) and assert identical output. The test verifies CALCULATION parity, not production data parity.

This is the same shape of divergence as Spec 2.3's grace-days issue — the master plan assumed data availability that doesn't hold in execution reality.

### Divergence 2 — Welcome and challenge badges are out of scope

The frontend badge catalog contains:

- 1 `welcome` badge — granted by `initializeBadgesForNewUser` at registration, NOT by `checkForNewBadges`
- 7 challenge badges (`challenge_lent`, `challenge_easter`, `challenge_pentecost`, `challenge_advent`, `challenge_newyear`, `challenge_first`, `challenge_master`) — granted by challenge-completion code paths, NOT by `checkForNewBadges`

These 8 badges have no eligibility logic in `checkForNewBadges`. They're manually granted by other code.

**Resolution:** `BadgeService.checkBadges` does NOT include these 8 badges in eligibility evaluation. They're correctly absent from the porting target. However, the `BadgeCatalog` (the metadata lookup table) DOES include them — so when those badges are eventually granted by other code, the catalog can return their name/description/celebrationTier metadata for the API response.

A future spec will:

1. Port `initializeBadgesForNewUser` (welcome badge granting) — likely as part of the registration flow rework
2. Port challenge-completion logic (`challenge_*` badges) — as part of a future challenges-migration spec

---

## Recon Facts (verified during brief authoring — re-verify suspect ones during execution)

### A) The frontend badge engine structure

`frontend/src/services/badge-engine.ts` exports:

```ts
export interface BadgeCheckContext {
  streak: StreakData;
  level: number;
  previousLevel: number;
  todayActivities: DailyActivities;
  activityCounts: ActivityCounts;
  friendCount: number;
  allActivitiesWereTrueBefore: boolean;
}

export function checkForNewBadges(
  context: BadgeCheckContext,
  earned: Record<string, BadgeEarnedEntry>,
): string[]
```

The function returns an ARRAY OF BADGE IDs that became newly eligible this call. Already-earned non-repeatable badges are filtered out (idempotency).

The function reads ADDITIONAL data from localStorage beyond the context:

- `wr_reading_plan_progress` (via raw `localStorage.getItem`)
- `wr_bible_progress` (via raw `localStorage.getItem`)
- `wr_meditation_history` (via `getMeditationHistory` service)
- `wr_gratitude_entries` (via `getGratitudeEntries` service)
- `wr_local_visits` (via `getUniqueVisitedPlaces` service)
- `wr_listening_history` (via raw `localStorage.getItem`)

The BACKEND port will receive ALL this data via the context input — it cannot read localStorage. See Architectural Decision #2.

### B) The 15 eligibility categories (in frontend file order)

1. **Streak badges** — `STREAK_THRESHOLDS [7, 14, 30, 60, 90, 180, 365]`. Compares `context.streak.currentStreak` against each.
2. **Level badges** — `level_<n>` for n in 1..6. Always pushes `level_<currentLevel>` if not already earned. Note: this fires on every call when called for an unfamiliar user; idempotency from `earned[]` filters subsequent calls.
3. **Activity milestone badges** — `pray:1,100`; `journal:1,50,100`; `meditate:1,25`; `listen:1,50`; `prayerWall:1`. Driven by `ACTIVITY_BADGE_MAP × ACTIVITY_MILESTONE_THRESHOLDS`.
4. **Full Worship Day** — composite condition.
   - `baseAllTrue = mood && pray && listen && prayerWall && meditate && journal`
   - `hasActivePlan = some plan in wr_reading_plan_progress has completedAt == null`
   - `allTrue = hasActivePlan ? (baseAllTrue && readingPlan) : baseAllTrue`
   - Fires only when `allTrue && !allActivitiesWereTrueBefore`.
   - **REPEATABLE** — fires every day the condition is met.
5. **Community badges** (friends + encouragements) — `friends:1,10`; `encouragements:10,50`.
6. **Reading plan completion** — counts plans where `completedAt != null`. Thresholds `1, 3, 10`. Reads `wr_reading_plan_progress`.
7. **Local Support Seeker** — total visits >= 5. Reads `wr_local_visits` via `getUniqueVisitedPlaces`. Badge ID `local_support_5`.
8. **Bible book completion** — counts books where chapters-read length >= `book.chapters`. Thresholds `1, 5, 10, 66`. Reads `wr_bible_progress` and `BIBLE_BOOKS` catalog.
9. **Meditation session milestones** — `sessions.length >= threshold`. Thresholds `10, 50, 100`. Reads `wr_meditation_history`.
10. **Prayer Wall post milestones** — `context.activityCounts.prayerWallPosts >= threshold`. Thresholds `1, 10`.
11. **Intercessor** — `context.activityCounts.intercessionCount >= 25`. Single threshold; badge `prayerwall_25_intercessions`.
12. **Bible chapter milestones** — `totalChapters` across all books >= threshold. Thresholds `1, 10, 25`.
13. **Gratitude milestones** — based on `uniqueDates` set from `wr_gratitude_entries`:
    - 30 days, 100 days (totalDays-based)
    - 7-day consecutive streak (sorted dates, find `maxConsecutive`)
    - Note: the 7-streak check has a guard `totalDays >= 7` AND requires `maxConsecutive >= 7` (more restrictive).
14. **Local support first visit** — total >= 1. Badge `local_first_visit`.
15. **Worship Listener** — `totalSeconds` across listening history sessions >= 36000 (10 hours). Badge `listen_10_hours`.

### C) Badge catalog — verbatim from `frontend/src/constants/dashboard/badges.ts`

The catalog has approximately 58 badges across these categories:

- 7 streak badges (`streak_7..streak_365`)
- 6 level badges (`level_1..level_6`, each with verse)
- 9 activity milestone badges
- 1 full worship day badge (REPEATABLE)
- 3 reading plan badges (one with verse)
- 4 bible book badges (two with verses)
- 6 community badges (incl. `local_support_5`)
- 7 challenge badges (OUT OF SCOPE per Divergence 2)
- 3 meditation milestone badges
- 3 prayer wall milestone badges
- 3 bible chapter milestone badges
- 3 gratitude milestone badges
- 1 local first visit badge
- 1 listening badge (`listen_10_hours`)
- 1 welcome badge (OUT OF SCOPE per Divergence 2)

CC must read the entire `constants/dashboard/badges.ts` file during recon and port the catalog **VERBATIM** — every id, name, description, category, celebrationTier, repeatable flag, and verse (if present).

### D) Celebration tiers

Frontend uses 4 distinct values:

- `'toast'` — small toast notification
- `'toast-confetti'` — toast with confetti animation
- `'special-toast'` — full-bleed special toast
- `'full-screen'` — full-screen celebration modal

These are STRINGS in the frontend (TypeScript string union). The backend should model them as a Java enum `CelebrationTier` with `@JsonValue` mapping to the same 4 string values.

### E) Badge metadata shapes

Frontend `BadgeDefinition` shape (from `types/dashboard.ts` — verify during recon):

```ts
interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  // 'streak', 'level', 'activity', 'community', 'special',
  // 'meditation', 'prayer-wall', 'bible', 'gratitude',
  // 'local-support', 'listening', 'challenge'
  celebrationTier: CelebrationTier;
  repeatable?: boolean; // true ONLY for full_worship_day
  verse?: { text: string; reference: string };
  // present on level_* and 3 others (plans_10, bible_book_10, bible_book_66)
}
```

### F) Spec 2.1 schema recap

`user_badges` table (created by Spec 2.1, currently empty):

| Column          | Type                       | Constraints                                                                |
| --------------- | -------------------------- | -------------------------------------------------------------------------- |
| `user_id`       | UUID                       | NOT NULL, FK → `users.id` ON DELETE CASCADE                                |
| `badge_id`      | VARCHAR(100)               | NOT NULL                                                                   |
| `earned_at`     | TIMESTAMP WITH TIME ZONE   | NOT NULL DEFAULT NOW()                                                     |
| `display_count` | INTEGER                    | NOT NULL DEFAULT 1; CHECK `user_badges_display_count_positive_check (> 0)` |
| —               | —                          | PRIMARY KEY `(user_id, badge_id)`                                          |

The JPA entity must map these four columns. Composite key needs `@IdClass` or `@EmbeddedId` per the existing conventions (verify by reading any other composite-key entity in the codebase, or follow standard JPA convention).

### G) Package structure

The `com.worshiproom.activity` package exists from Spec 2.2 (FaithPoints*) and 2.3 (Streak*). Spec 2.4 adds:

- `com.worshiproom.activity.UserBadge` (entity)
- `com.worshiproom.activity.UserBadgeId` (composite-key class)
- `com.worshiproom.activity.BadgeRepository`
- `com.worshiproom.activity.BadgeService`
- `com.worshiproom.activity.BadgeCheckContext` (input record)
- `com.worshiproom.activity.constants.BadgeCatalog`
- `com.worshiproom.activity.constants.BadgeThresholds`
- `com.worshiproom.activity.constants.BibleBooks`
- `com.worshiproom.activity.dto.BadgeDefinition`
- `com.worshiproom.activity.dto.BadgeResult`
- `com.worshiproom.activity.dto.BadgeVerse`
- `com.worshiproom.activity.dto.ActivityCountsSnapshot`
- `com.worshiproom.activity.dto.ReadingPlanProgress`
- `com.worshiproom.activity.dto.BibleProgressSnapshot`
- `com.worshiproom.activity.dto.MeditationSession`
- `com.worshiproom.activity.dto.GratitudeEntriesSnapshot`
- `com.worshiproom.activity.dto.LocalVisitsSnapshot`
- `com.worshiproom.activity.dto.ListeningSession`
- `com.worshiproom.activity.CelebrationTier` (enum)

---

## Architectural Decisions

### 1. Pure calculation service — no database

Mirrors 2.2 and 2.3. `BadgeService.checkBadges` takes input, returns output, no `@Autowired` dependencies. Spec 2.6 will compose this with persistence.

Method signature:

```java
public BadgeResult checkBadges(
    BadgeCheckContext context,
    Set<String> alreadyEarnedBadgeIds
)
```

Returns a `BadgeResult` with:

- `List<String> newlyEarnedBadgeIds`
- `List<BadgeDefinition> newlyEarnedDefinitions` (full metadata for the API response)

### 2. Context input is a comprehensive record

`BadgeCheckContext` mirrors the frontend's context shape PLUS includes the data the frontend reads from localStorage:

```java
public record BadgeCheckContext(
    // From frontend's BadgeCheckContext directly:
    int currentStreak,
    int longestStreak,
    int currentLevel,
    int previousLevel,
    Set<ActivityType> todayActivities,
    ActivityCountsSnapshot activityCounts,
    int friendCount,
    boolean allActivitiesWereTrueBefore,
    // From localStorage data the backend caller must
    // assemble (or pass empty when unavailable):
    List<ReadingPlanProgress> readingPlanProgress,   // empty list ok
    BibleProgressSnapshot bibleProgress,             // empty map ok
    List<MeditationSession> meditationHistory,       // empty list ok
    GratitudeEntriesSnapshot gratitudeEntries,       // empty list ok
    LocalVisitsSnapshot localVisits,                 // zeros ok
    List<ListeningSession> listeningHistory          // empty list ok
)
```

Each "snapshot" record is a thin DTO matching the shape the frontend reads. CC defines them in the `dto/` subpackage.

When the data isn't available (most of these during the dual-write phase), the caller passes empty collections. The service correctly returns no badges from those categories.

### 3. Badge catalog is a final class with static lookup

`com.worshiproom.activity.constants.BadgeCatalog` is a utility class (final, private constructor) holding all ~58 badges as a `Map<String, BadgeDefinition>` keyed by ID.

- Static method `lookup(String badgeId)` returns the `BadgeDefinition` or throws if unknown.
- Static method `all()` returns the full immutable map.

Welcome and challenge badges ARE in the catalog (for metadata lookup) but NOT exercised by `checkBadges` (per Divergence 2).

### 4. `BadgeDefinition` record mirrors frontend shape

```java
public record BadgeDefinition(
    String id,
    String name,
    String description,
    String category,            // see recon section E for 12 valid values
    CelebrationTier celebrationTier,
    boolean repeatable,         // false for all except full_worship_day
    Optional<BadgeVerse> verse  // present on level_*, plans_10, bible_book_10, bible_book_66
)
```

`BadgeVerse` is a separate record: `(String text, String reference)`.

### 5. `CelebrationTier` enum with JSON values

```java
public enum CelebrationTier {
    TOAST("toast"),
    TOAST_CONFETTI("toast-confetti"),
    SPECIAL_TOAST("special-toast"),
    FULL_SCREEN("full-screen");
    // @JsonValue accessor returning the wire string
}
```

Same pattern as `ActivityType` from Spec 2.2.

### 6. Thresholds live in a separate constants class

`com.worshiproom.activity.constants.BadgeThresholds`:

```java
public static final int[] STREAK = {7, 14, 30, 60, 90, 180, 365};
public static final Map<ActivityType, int[]> ACTIVITY_MILESTONES;
public static final int[] FRIENDS = {1, 10};
public static final int[] ENCOURAGEMENTS = {10, 50};
public static final int[] READING_PLAN_COMPLETIONS = {1, 3, 10};
public static final int LOCAL_SUPPORT_VISITS = 5;
public static final int[] BIBLE_BOOKS = {1, 5, 10, 66};
public static final int[] MEDITATION_SESSIONS = {10, 50, 100};
public static final int[] PRAYER_WALL_POSTS = {1, 10};
public static final int INTERCESSIONS = 25;
public static final int[] BIBLE_CHAPTERS = {1, 10, 25};
public static final int[] GRATITUDE_TOTAL_DAYS = {30, 100};
public static final int GRATITUDE_CONSECUTIVE_STREAK = 7;
public static final int LOCAL_FIRST_VISIT = 1;
public static final int LISTEN_10_HOURS_SECONDS = 36000;
```

### 7. The 15 eligibility categories port one-to-one

`BadgeService.checkBadges` runs 15 sequential category checks, in the SAME ORDER as the frontend. Each category produces zero or more badge IDs. The combined list is filtered against `alreadyEarnedBadgeIds` before return — except for repeatable badges (`full_worship_day`), which pass through even if already-earned.

The repeatable filter logic:

```java
if (alreadyEarned && !catalog.lookup(badgeId).repeatable())
    skip;
else
    include;
```

The `full_worship_day` badge will be included on every call where the eligibility condition fires, regardless of whether it's already in `alreadyEarnedBadgeIds`. The CALLER in Spec 2.6 increments `display_count` when persisting repeatable badges that re-fire.

### 8. Idempotency contract

Calling `checkBadges` twice in a row with the same context and the same `alreadyEarnedBadgeIds` (now updated to include the badges from the first call) returns ZERO badges on the second call — except repeatable badges, which fire on every call where the condition holds.

**Test discipline:** at least one test verifies this contract explicitly.

### 9. 7-day consecutive gratitude streak algorithm

The frontend's algorithm (verbatim from `badge-engine.ts`):

- Build a `Set` of unique entry dates
- Sort them as strings
- Walk pairs; compute `diffDays` via:
  - `new Date(prev + 'T12:00:00').getTime()` vs `new Date(curr + 'T12:00:00').getTime()`
  - `Math.round((curr - prev) / (1000 * 60 * 60 * 24))`
- Track `maxConsecutive` across the walk; reset to 1 on any non-1 diff
- Fire badge if `maxConsecutive >= 7`

**Java equivalent:** use `LocalDate.parse()` and `ChronoUnit.DAYS.between(prev, curr)`. `LocalDate` handles the day-arithmetic without needing the noon-anchor JS trick (which exists to avoid DST issues; `LocalDate` has no time component, so DST is irrelevant).

**Result: byte-identical output, cleaner Java code.**

### 10. No logging, no Sentry, no metrics

Same posture as 2.2 and 2.3. Pure calculation.

---

## Files to Create

### Production source (~18 files)

- `backend/src/main/java/com/worshiproom/activity/UserBadge.java`
  - JPA entity. `@Entity`, `@Table(name = "user_badges")`. Composite key `(user_id, badge_id)` — use `@IdClass` with `UserBadgeId` or `@EmbeddedId` per existing conventions.
- `backend/src/main/java/com/worshiproom/activity/UserBadgeId.java`
  - Composite key class for `UserBadge`.
- `backend/src/main/java/com/worshiproom/activity/BadgeRepository.java`
  - Spring Data JPA interface extending `JpaRepository<UserBadge, UserBadgeId>`. No custom methods in this spec.
- `backend/src/main/java/com/worshiproom/activity/BadgeService.java`
  - `@Service`, no `@Autowired` dependencies. Single public method `checkBadges(BadgeCheckContext, Set<String>)` returning `BadgeResult`. Plus private helpers for each of the 15 categories.
- `backend/src/main/java/com/worshiproom/activity/BadgeCheckContext.java`
  - Java record per Architectural Decision #2.
- `backend/src/main/java/com/worshiproom/activity/CelebrationTier.java`
  - Java enum per Architectural Decision #5.
- `backend/src/main/java/com/worshiproom/activity/dto/BadgeDefinition.java`
  - Java record per Architectural Decision #4.
- `backend/src/main/java/com/worshiproom/activity/dto/BadgeVerse.java`
  - Java record `(String text, String reference)`.
- `backend/src/main/java/com/worshiproom/activity/dto/BadgeResult.java`
  - Java record `(List<String> newlyEarnedBadgeIds, List<BadgeDefinition> newlyEarnedDefinitions)`.
- `backend/src/main/java/com/worshiproom/activity/dto/ActivityCountsSnapshot.java`
  - Java record mirroring the frontend's `ActivityCounts` type. Fields per recon (verify against frontend): `pray`, `journal`, `meditate`, `listen`, `prayerWall`, `readingPlan`, `gratitude`, `reflection`, `encouragementsSent`, `fullWorshipDays`, `challengesCompleted`, `intercessionCount`, `bibleChaptersRead`, `prayerWallPosts`.
- `backend/src/main/java/com/worshiproom/activity/dto/ReadingPlanProgress.java`
  - Java record `(String planSlug, LocalDateTime completedAt)` (nullable `completedAt`). Used in `BadgeCheckContext.readingPlanProgress`.
- `backend/src/main/java/com/worshiproom/activity/dto/BibleProgressSnapshot.java`
  - Java record wrapping a `Map<String, Set<Integer>>` (book slug → set of completed chapter numbers).
- `backend/src/main/java/com/worshiproom/activity/dto/MeditationSession.java`
  - Java record `(LocalDateTime occurredAt, int durationSeconds)`.
- `backend/src/main/java/com/worshiproom/activity/dto/GratitudeEntriesSnapshot.java`
  - Java record wrapping a `List<LocalDate>` (entry dates, duplicates allowed; the service will reduce to unique).
- `backend/src/main/java/com/worshiproom/activity/dto/LocalVisitsSnapshot.java`
  - Java record `(int totalUniqueVisits)`.
- `backend/src/main/java/com/worshiproom/activity/dto/ListeningSession.java`
  - Java record `(LocalDateTime occurredAt, int durationSeconds)`.
- `backend/src/main/java/com/worshiproom/activity/constants/BadgeCatalog.java`
  - Final class per Architectural Decision #3. Contains all ~58 badges with verbatim metadata from the frontend.
- `backend/src/main/java/com/worshiproom/activity/constants/BadgeThresholds.java`
  - Final class per Architectural Decision #6.
- `backend/src/main/java/com/worshiproom/activity/constants/BibleBooks.java`
  - Final class with the 66-book catalog (slug + chapter count). Read from `frontend/src/constants/bible.ts` `BIBLE_BOOKS` during recon and port verbatim.

### Tests (2 files)

- `backend/src/test/java/com/worshiproom/activity/BadgeServiceTest.java`
  - Unit tests per the **Tests Required** section below.
- `backend/src/test/java/com/worshiproom/activity/BadgeCatalogTest.java`
  - Sanity tests over the catalog itself (size, every badge has a celebration tier, every category is one of the 12 valid strings, etc.).

---

## Files to Modify

**NONE.**

- `pom.xml`: no new dependencies.
- `application.properties` (any profile): no changes.
- `master.xml`: no changes.
- `LiquibaseSmokeTest`: no changes.
- `openapi.yaml`: no changes.
- `FaithPointsService`, `StreakService`, and their entities/DTOs/tests from 2.2 and 2.3: no changes.
- `ActivityType` enum from 2.2: no changes.

---

## Database Changes

**NONE.** The `user_badges` table already exists from Spec 2.1. This spec only creates the JPA entity that maps to the existing schema. No `ALTER TABLE`, no new tables, no new indexes, no new changesets.

---

## API Changes

**NONE.** No controller, no endpoint, no OpenAPI updates. Spec 2.6 owns the `POST /api/v1/activity` endpoint that will compose `BadgeService` with persistence and HTTP.

---

## Tests Required

Test classes:

- `BadgeServiceTest` (eligibility logic)
- `BadgeCatalogTest` (catalog sanity)

Both pure JUnit 5; no `@SpringBootTest`, no Testcontainers, no database. Master plan asks for 30+ tests; aim for 50+ to cover the breadth of the 15 categories.

### A) Streak badges (8 tests)

- One test per threshold (`streak_7`, `_14`, `_30`, `_60`, `_90`, `_180`, `_365`) firing at exact match
- One test verifying lower-threshold badges still in `earned[]` are filtered out

### B) Level badges (4 tests)

- `level_<n>` fires when `context.currentLevel = n` and `level_<n>` is not in earned
- Already-earned level badge is filtered out
- Multiple level badges from prior levels NOT re-fired even if user is now at higher level (only the current level fires)
- Level 6 cap behavior

### C) Activity milestones (6 tests)

- `first_prayer` fires at `pray=1`
- `prayer_100` fires at `pray=100`, doesn't fire at `pray=99`
- `first_journal` / `journal_50` / `journal_100` boundary tests
- `meditate` / `listen` / `prayerWall` first-time tests

### D) Full Worship Day (5 tests)

- All 6 base activities true, no active plan → fires
- 5 of 6 base activities true → does NOT fire
- All 6 base activities + reading plan present and active → must include `readingPlan` to fire
- Active plan + base 6 true but `readingPlan` false → does NOT fire
- `allActivitiesWereTrueBefore=true` short-circuits even if condition met
- **REPEATABILITY:** `full_worship_day` in `earned[]` still fires if condition met (the only repeatable-in-eligibility badge)

### E) Community badges (4 tests)

- `first_friend` at `friendCount=1`
- `friends_10` at `friendCount=10`
- `encourage_10` at `activityCounts.encouragementsSent=10`
- `encourage_50` at `activityCounts.encouragementsSent=50`

### F) Reading plan completion (3 tests)

- `first_plan` fires when 1 plan has `completedAt != null`
- `plans_3` at 3 completed
- `plans_10` at 10 completed

### G) Bible book completion (4 tests)

- `bible_book_1` fires when 1 book has all chapters read
- `bible_book_5` at 5 books
- `bible_book_10` at 10 books
- `bible_book_66` at 66 books

### H) Meditation session milestones (3 tests)

- `meditate_10` at `sessions.size()=10`
- `meditate_50` at 50
- `meditate_100` at 100

### I) Prayer wall post + intercession milestones (3 tests)

- `prayerwall_first_post` at `prayerWallPosts=1`
- `prayerwall_10_posts` at 10
- `prayerwall_25_intercessions` at `intercessionCount=25`

### J) Bible chapter milestones (3 tests)

- `bible_first_chapter` at `totalChapters=1`
- `bible_10_chapters` at 10
- `bible_25_chapters` at 25

### K) Gratitude milestones (5 tests)

- `gratitude_30_days` at `uniqueDates.size()=30`
- `gratitude_100_days` at 100
- `gratitude_7_streak` when 7 consecutive days exist
- `gratitude_7_streak` does NOT fire if 7 unique days exist but max consecutive run is < 7
- `gratitude_7_streak` does NOT fire if `totalDays < 7`

### L) Local support badges (3 tests)

- `local_first_visit` at `total=1`
- `local_support_5` at `total=5`
- Both fire together at `total=5` (first_visit not yet earned)

### M) Listening (2 tests)

- `listen_10_hours` fires when `totalSeconds=36000` exactly
- Does NOT fire at 35999

### N) Idempotency (3 tests)

- Call `checkBadges` twice; second call returns no badges (assuming `earned[]` updated)
- `full_worship_day` fires on every call where condition holds (repeatability)
- Mixed: first call returns 5 new badges; second call with those 5 in `earned[]` returns 0 (or 1 if `full_worship_day` condition still holds)

### O) Empty / defensive (2 tests)

- Empty context (zero everything, empty collections) → returns no badges
- Welcome and challenge badges NEVER fire from `checkBadges` (verify explicit absence in result)

### P) `BadgeCatalog` sanity (5+ tests in `BadgeCatalogTest`)

- Catalog size matches expected ~58 (exact count from frontend)
- Every badge has a non-null `celebrationTier`
- Every badge's `category` is one of the 12 valid strings
- `lookup(unknown_id)` throws or returns `Optional.empty` (CC's choice)
- `all()` returns immutable map
- Welcome and challenge badges are present (for metadata lookup) even though not exercised by `checkBadges`

**Total minimum: 50+ tests across the two test classes.** The master plan asks for 30+; this list goes deliberately further to pin every category thoroughly.

---

## Acceptance Criteria

- [ ] `com.worshiproom.activity` package has the new production source files listed in **Files to Create** (~18 new files)
- [ ] `UserBadge` JPA entity maps to `user_badges` table with all four columns and composite primary key
- [ ] `BadgeRepository` extends `JpaRepository<UserBadge, UserBadgeId>`; no custom methods
- [ ] `BadgeService.checkBadges` takes `BadgeCheckContext` + `Set<String>`; returns `BadgeResult`
- [ ] All 15 eligibility categories ported with verbatim logic from frontend
- [ ] `BadgeCatalog` has all ~58 badges from the frontend constants file with byte-identical id, name, description, category, celebrationTier, repeatable flag, and verse
- [ ] `CelebrationTier` enum has exactly 4 values mapping to the wire strings `'toast'`, `'toast-confetti'`, `'special-toast'`, `'full-screen'`
- [ ] `BadgeThresholds` constants match frontend values exactly (`STREAK_THRESHOLDS`, `ACTIVITY_MILESTONE_THRESHOLDS`, `COMMUNITY_BADGE_THRESHOLDS`, etc.)
- [ ] `BibleBooks` catalog has 66 entries matching the frontend `BIBLE_BOOKS` constant verbatim (slug + chapter count)
- [ ] **Idempotency:** calling `checkBadges` twice with the same context (and `earned[]` updated) returns 0 new non-repeatable badges on the second call
- [ ] **Repeatability:** `full_worship_day` fires on every call where the eligibility condition holds, regardless of already-earned status
- [ ] Welcome and challenge badges are NOT returned by `checkBadges` in any scenario (per Divergence 2)
- [ ] `BadgeServiceTest` has at least 45 tests covering the 14 eligibility categories (excluding welcome/challenge) + idempotency + repeatability + defensive cases
- [ ] `BadgeCatalogTest` has at least 5 sanity tests
- [ ] All tests are pure JUnit 5
- [ ] Backend test baseline: prior count + ~50 new tests, all green
- [ ] No frontend changes
- [ ] No new dependency in `pom.xml`
- [ ] No `openapi.yaml` changes
- [ ] No `master.xml` changes
- [ ] `LiquibaseSmokeTest` unchanged
- [ ] FaithPoints, Streak, and 2.2/2.3 deliverables unchanged

---

## Out of Scope

- Welcome badge granting (init flow — separate spec)
- Challenge badge granting (challenge-completion code paths — separate spec)
- The Activity Counts service (Spec 2.5)
- The `POST /api/v1/activity` endpoint (Spec 2.6)
- Persisting `user_badges` rows (Spec 2.6 owns this)
- Incrementing `display_count` on repeatable badges (Spec 2.6 composes the `BadgeService` output with persistence)
- Frontend dual-write (Spec 2.7)
- Drift detection (Spec 2.8)
- Modifying any frontend file
- Modifying constants in `frontend/src/constants/dashboard/`
- Adding columns to `user_badges` table (no `ALTER` migrations)
- Creating new tables (no schema work)
- Modifying `FaithPointsService`, `StreakService`, or any 2.2/2.3 deliverables
- Reading plans, bible progress, meditation history, gratitude entries, local visits, or listening history backend tables (those migrate in later phases)
- The intercession-count or prayer-wall-post-count increment logic (Spec 2.5 / Spec 2.6 own this)

---

## Guardrails (DO NOT)

- **Do NOT change branches.** Stay on `forums-wave-continued`.
- Do NOT modify any frontend file.
- Do NOT modify `constants/dashboard/badges.ts` or `constants/bible.ts`.
- Do NOT improve, refactor, or "clean up" the eligibility logic. Port it verbatim.
- Do NOT skip categories the backend "can't currently support" — port all 15. Empty/zero context inputs naturally produce no badges from those categories.
- Do NOT include welcome or challenge badges in `checkBadges` eligibility logic.
- Do NOT add database access to `BadgeService`.
- Do NOT inject the repository into the service.
- Do NOT add a controller. Spec 2.6 owns `POST /api/v1/activity`.
- Do NOT add columns to `user_badges`. The schema is what it is.
- Do NOT create new tables.
- Do NOT add `Sentry.captureException` calls.
- Do NOT add `@Transactional` anywhere.
- Do NOT modify `openapi.yaml`.
- Do NOT write to `display_count` or persist new badges. The service is read-only with respect to persistence.
- Do NOT use the noon-anchor date trick for the gratitude consecutive-streak algorithm. `LocalDate` has no time component; DST is irrelevant; `ChronoUnit.DAYS.between` is the right primitive.
- Do NOT modify `FaithPointsService`, `StreakService`, `ActivityType`, or any 2.2/2.3 deliverable.
- Do NOT commit, push, or do any git operation. Eric handles all git.
- Do NOT touch `_forums_master_plan/spec-tracker.md`.

---

## Plan Shape Expectation

`/plan-forums` output for this L/Medium spec should be 14–20 steps:

1. **Recon:** read frontend `badge-engine.ts` (15 categories), `constants/dashboard/badges.ts` (full catalog), `constants/bible.ts` (66 books), `badge-storage.ts` (for repeatability/`display_count` semantics), `types/dashboard.ts` (`BadgeDefinition` shape). Verify Divergences 1 and 2 by inspecting `checkForNewBadges` for welcome/challenge absence and the localStorage reads. Confirm `user_badges` schema from Spec 2.1.
2. Author `CelebrationTier` enum.
3. Author `BadgeVerse`, `BadgeDefinition`, `BadgeResult` records.
4. Author the snapshot DTOs (`ActivityCountsSnapshot`, `ReadingPlanProgress`, `BibleProgressSnapshot`, `MeditationSession`, `GratitudeEntriesSnapshot`, `LocalVisitsSnapshot`, `ListeningSession`).
5. Author `BadgeCheckContext` record composing all of the above.
6. Author `BibleBooks` catalog (66 books, verbatim port).
7. Author `BadgeThresholds` constants.
8. Author `BadgeCatalog` with all ~58 badges.
9. Author `UserBadgeId` composite key.
10. Author `UserBadge` JPA entity.
11. Author `BadgeRepository` interface stub.
12. Author `BadgeService` — implement the 15 category checks in order, plus the idempotency filter, plus the repeatability handling.
13. Author `BadgeCatalogTest` (sanity tests).
14. Author `BadgeServiceTest` with all ~45 eligibility tests grouped by category.
15. Run `./mvnw test`; iterate.
16. Self-review against acceptance criteria; specifically verify Divergence 2 (no welcome/challenge in eligibility) and idempotency contract.

**If the plan comes back with 25+ steps, proposes a controller, proposes `ALTER` migrations, proposes implementing welcome or challenge badge logic, or proposes any DB access from `BadgeService`, push back hard.**

---

## Notes for Eric

- **Largest spec of Phase 2 so far.** The catalog (~58 badges) and the 15 category checks make this denser than 2.2 and 2.3 combined. CC will spend meaningful time on recon reading the frontend files; that's correct.
- **Two important divergences from master plan v2.9:**
  1. Backend lacks data for ~half the categories — pure-function-over-context design handles this cleanly
  2. Welcome and challenge badges aren't in `checkForNewBadges` — out of scope for eligibility service; future specs grant them

  When this spec ships, the Phase 2 Execution Reality Note to add to master plan should mention: grace days, grief pause, repair-state (from Spec 2.3), AND the badge-data-source divergence (from this spec).
- **Pre-execution checklist:** Docker NOT required (pure unit tests). Postgres NOT required.
- **Spec 2.5** (Activity Counts Service) is next after 2.4. It's the persistence companion for activity counts that 2.4's context input requires. S-sized, low-risk; should be shorter than 2.4 by a wide margin.
