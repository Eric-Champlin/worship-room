package com.worshiproom.activity;

import com.worshiproom.activity.dto.ActivityBackfillRequest;
import com.worshiproom.activity.dto.ActivityBackfillRequest.ActivityCountsPayload;
import com.worshiproom.activity.dto.ActivityBackfillRequest.ActivityFlags;
import com.worshiproom.activity.dto.ActivityBackfillRequest.BadgeEntry;
import com.worshiproom.activity.dto.ActivityBackfillResponse;
import com.worshiproom.user.User;
import com.worshiproom.user.UserException;
import com.worshiproom.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Transactional orchestrator for {@code POST /api/v1/activity/backfill} (Spec 2.10).
 *
 * <p>One-time idempotent batch import of a user's pre-cutover localStorage
 * activity history into the five Phase 2 shadow tables. Per-table strategy
 * (see spec brief Architectural Decisions #2–#7):
 * <ul>
 *   <li>{@code activity_log}: INSERT ... ON CONFLICT (user_id, activity_type,
 *       occurred_at) WHERE source_feature='backfill' DO NOTHING. Synthetic
 *       noon-in-user-timezone {@code occurred_at}.</li>
 *   <li>{@code faith_points}: UPSERT, OVERWRITE total_points + current_level.</li>
 *   <li>{@code streak_state}: UPSERT, OVERWRITE current_streak, longest_streak,
 *       last_active_date.</li>
 *   <li>{@code user_badges}: INSERT ... ON CONFLICT (user_id, badge_id) DO
 *       NOTHING — preserves real-time badge state.</li>
 *   <li>{@code activity_counts}: UPSERT, OVERWRITE count_value per count_type.</li>
 * </ul>
 *
 * <p>Single transaction; any failure rolls back all five table writes. Frontend
 * retries on next dual-write.
 *
 * <p>PII discipline: logs userId (UUID), schemaVersion, payload date-count, and
 * the five response counts. Never logs activity flag content, badge metadata,
 * or any free-text fields.
 */
@Service
public class ActivityBackfillService {

    private static final Logger log = LoggerFactory.getLogger(ActivityBackfillService.class);

    /** Wire string for the source_feature column on backfilled rows. */
    private static final String BACKFILL_SOURCE = "backfill";

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    public ActivityBackfillService(UserRepository userRepository, JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public ActivityBackfillResponse backfill(UUID userId, ActivityBackfillRequest request) {
        User user = userRepository.findById(userId).orElseThrow(UserException::userNotFound);
        ZoneId tz = resolveZone(user.getTimezone(), request.userTimezone());

        log.info("Backfill received userId={} schemaVersion={} dateCount={}",
            userId, request.schemaVersion(), request.activityLog().size());

        int activityLogRowsInserted = backfillActivityLog(userId, tz, request.activityLog());
        backfillFaithPoints(userId, request.faithPoints());
        backfillStreakState(userId, request.streak());
        int badgesInserted = backfillUserBadges(userId, request.badges().earned());
        int activityCountsUpserted = backfillActivityCounts(userId, request.badges().activityCounts());

        log.info("Backfill complete userId={} activityLogRows={} badges={} counts={}",
            userId, activityLogRowsInserted, badgesInserted, activityCountsUpserted);

        return new ActivityBackfillResponse(
            activityLogRowsInserted,
            true,
            true,
            badgesInserted,
            activityCountsUpserted
        );
    }

    // ─── activity_log ────────────────────────────────────────────────────

    private int backfillActivityLog(UUID userId, ZoneId tz, Map<String, ActivityFlags> activityLog) {
        if (activityLog == null || activityLog.isEmpty()) return 0;
        int inserted = 0;
        for (Map.Entry<String, ActivityFlags> dayEntry : activityLog.entrySet()) {
            String dateString = dayEntry.getKey();
            LocalDate date;
            try {
                date = LocalDate.parse(dateString);
            } catch (java.time.DateTimeException e) {
                log.warn("Skipping backfill activityLog entry with invalid date='{}'", dateString);
                continue;
            }
            // Synthetic noon in user's tz, converted to UTC Instant for TIMESTAMPTZ
            Instant occurredInstant = date.atTime(12, 0).atZone(tz).toInstant();
            OffsetDateTime occurredAt = occurredInstant.atOffset(ZoneOffset.UTC);
            ActivityFlags flags = dayEntry.getValue();
            if (flags == null) continue;

            inserted += insertIfActive(userId, "mood",         flags.mood(),         occurredAt, date);
            inserted += insertIfActive(userId, "pray",         flags.pray(),         occurredAt, date);
            inserted += insertIfActive(userId, "listen",       flags.listen(),       occurredAt, date);
            inserted += insertIfActive(userId, "prayerWall",   flags.prayerWall(),   occurredAt, date);
            inserted += insertIfActive(userId, "readingPlan",  flags.readingPlan(),  occurredAt, date);
            inserted += insertIfActive(userId, "meditate",     flags.meditate(),     occurredAt, date);
            inserted += insertIfActive(userId, "journal",      flags.journal(),      occurredAt, date);
            inserted += insertIfActive(userId, "gratitude",    flags.gratitude(),    occurredAt, date);
            inserted += insertIfActive(userId, "reflection",   flags.reflection(),   occurredAt, date);
            inserted += insertIfActive(userId, "challenge",    flags.challenge(),    occurredAt, date);
            inserted += insertIfActive(userId, "localVisit",   flags.localVisit(),   occurredAt, date);
            inserted += insertIfActive(userId, "devotional",   flags.devotional(),   occurredAt, date);
        }
        return inserted;
    }

    private int insertIfActive(UUID userId, String activityType, boolean flag,
                               OffsetDateTime occurredAt, LocalDate originalDate) {
        if (!flag) return 0;
        // ON CONFLICT keyed on the partial unique index defined by changeset 008.
        // Returns 0 on conflict (already-backfilled), 1 on insert.
        // originalDate is a LocalDate, so toString() is guaranteed canonical
        // ISO_LOCAL_DATE (YYYY-MM-DD) — no JSON-injection risk from the
        // string-concatenated metadata literal below.
        String metadataJson = "{\"backfilled\":true,\"originalDate\":\"" + originalDate + "\"}";
        return jdbcTemplate.update(
            "INSERT INTO activity_log (id, user_id, activity_type, source_feature, " +
            "occurred_at, points_earned, metadata) " +
            "VALUES (gen_random_uuid(), ?, ?, ?, ?, 0, ?::jsonb) " +
            "ON CONFLICT (user_id, activity_type, occurred_at) " +
            "  WHERE source_feature = 'backfill' DO NOTHING",
            userId, activityType, BACKFILL_SOURCE, occurredAt, metadataJson
        );
    }

    // ─── faith_points (overwrite) ────────────────────────────────────────

    private void backfillFaithPoints(UUID userId,
            ActivityBackfillRequest.FaithPointsPayload payload) {
        jdbcTemplate.update(
            "INSERT INTO faith_points (user_id, total_points, current_level, last_updated) " +
            "VALUES (?, ?, ?, NOW()) " +
            "ON CONFLICT (user_id) DO UPDATE SET " +
            "  total_points = EXCLUDED.total_points, " +
            "  current_level = EXCLUDED.current_level, " +
            "  last_updated = NOW()",
            userId, payload.totalPoints(), payload.currentLevel()
        );
    }

    // ─── streak_state (overwrite) ────────────────────────────────────────

    private void backfillStreakState(UUID userId,
            ActivityBackfillRequest.StreakPayload payload) {
        LocalDate lastActive = (payload.lastActiveDate() == null || payload.lastActiveDate().isBlank())
            ? null
            : LocalDate.parse(payload.lastActiveDate());
        jdbcTemplate.update(
            "INSERT INTO streak_state (user_id, current_streak, longest_streak, last_active_date) " +
            "VALUES (?, ?, ?, ?) " +
            "ON CONFLICT (user_id) DO UPDATE SET " +
            "  current_streak = EXCLUDED.current_streak, " +
            "  longest_streak = EXCLUDED.longest_streak, " +
            "  last_active_date = EXCLUDED.last_active_date",
            userId, payload.currentStreak(), payload.longestStreak(), lastActive
        );
    }

    // ─── user_badges (DO NOTHING) ────────────────────────────────────────

    private int backfillUserBadges(UUID userId, Map<String, BadgeEntry> earned) {
        if (earned == null || earned.isEmpty()) return 0;
        int inserted = 0;
        for (Map.Entry<String, BadgeEntry> e : earned.entrySet()) {
            String badgeId = e.getKey();
            BadgeEntry entry = e.getValue();
            OffsetDateTime earnedAt = parseEarnedAt(entry == null ? null : entry.earnedAt());
            int displayCount = (entry != null && entry.count() != null && entry.count() > 0)
                ? entry.count()
                : 1;
            inserted += jdbcTemplate.update(
                "INSERT INTO user_badges (user_id, badge_id, earned_at, display_count) " +
                "VALUES (?, ?, ?, ?) " +
                "ON CONFLICT (user_id, badge_id) DO NOTHING",
                userId, badgeId, earnedAt, displayCount
            );
        }
        return inserted;
    }

    // ─── activity_counts (overwrite) ─────────────────────────────────────

    private int backfillActivityCounts(UUID userId, ActivityCountsPayload counts) {
        if (counts == null) return 0;
        Map<String, Integer> wireToValue = new LinkedHashMap<>();
        wireToValue.put("pray",                  zeroIfNull(counts.pray()));
        wireToValue.put("journal",               zeroIfNull(counts.journal()));
        wireToValue.put("meditate",              zeroIfNull(counts.meditate()));
        wireToValue.put("listen",                zeroIfNull(counts.listen()));
        wireToValue.put("prayerWall",            zeroIfNull(counts.prayerWall()));
        wireToValue.put("readingPlan",           zeroIfNull(counts.readingPlan()));
        wireToValue.put("gratitude",             zeroIfNull(counts.gratitude()));
        wireToValue.put("reflection",            zeroIfNull(counts.reflection()));
        wireToValue.put("encouragementsSent",    zeroIfNull(counts.encouragementsSent()));
        wireToValue.put("fullWorshipDays",       zeroIfNull(counts.fullWorshipDays()));
        wireToValue.put("challengesCompleted",   zeroIfNull(counts.challengesCompleted()));
        wireToValue.put("intercessionCount",     zeroIfNull(counts.intercessionCount()));
        wireToValue.put("bibleChaptersRead",     zeroIfNull(counts.bibleChaptersRead()));
        wireToValue.put("prayerWallPosts",       zeroIfNull(counts.prayerWallPosts()));

        for (Map.Entry<String, Integer> e : wireToValue.entrySet()) {
            jdbcTemplate.update(
                "INSERT INTO activity_counts (user_id, count_type, count_value, last_updated) " +
                "VALUES (?, ?, ?, NOW()) " +
                "ON CONFLICT (user_id, count_type) DO UPDATE SET " +
                "  count_value = EXCLUDED.count_value, " +
                "  last_updated = NOW()",
                userId, e.getKey(), e.getValue()
            );
        }
        return wireToValue.size();   // always 14
    }

    // ─── helpers ──────────────────────────────────────────────────────────

    private static int zeroIfNull(Integer n) {
        return n == null ? 0 : n;
    }

    private static OffsetDateTime parseEarnedAt(String iso) {
        if (iso == null || iso.isBlank()) {
            return OffsetDateTime.now(ZoneOffset.UTC);
        }
        try {
            return OffsetDateTime.parse(iso);
        } catch (java.time.DateTimeException e) {
            return OffsetDateTime.now(ZoneOffset.UTC);
        }
    }

    private ZoneId resolveZone(String dbTimezone, String requestTimezone) {
        // Mirror ActivityService.resolveZone semantics: db is authoritative,
        // request is sanity-check only, fallback to UTC.
        ZoneId db = parseZoneOrNull(dbTimezone);
        ZoneId req = parseZoneOrNull(requestTimezone);
        if (db != null && req != null && !db.equals(req)) {
            log.warn("Backfill userTimezone='{}' disagrees with users.timezone='{}'; using DB value",
                requestTimezone, dbTimezone);
        }
        if (db != null) return db;
        if (req != null) return req;
        return ZoneOffset.UTC;
    }

    private static ZoneId parseZoneOrNull(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return ZoneId.of(s);
        } catch (java.time.DateTimeException e) {
            return null;
        }
    }
}
