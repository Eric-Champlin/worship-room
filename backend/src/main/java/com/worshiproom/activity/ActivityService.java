package com.worshiproom.activity;

import com.worshiproom.activity.constants.BadgeThresholds;
import com.worshiproom.activity.constants.LevelThresholds;
import com.worshiproom.activity.constants.LevelThresholds.LevelInfo;
import com.worshiproom.activity.constants.MultiplierTiers;
import com.worshiproom.activity.dto.ActivityCountsSnapshot;
import com.worshiproom.activity.dto.ActivityRequest;
import com.worshiproom.activity.dto.ActivityResponseData;
import com.worshiproom.activity.dto.BadgeDefinition;
import com.worshiproom.activity.dto.BadgeResult;
import com.worshiproom.activity.dto.BibleProgressSnapshot;
import com.worshiproom.activity.dto.FaithPointsResult;
import com.worshiproom.activity.dto.GratitudeEntriesSnapshot;
import com.worshiproom.activity.dto.LocalVisitsSnapshot;
import com.worshiproom.activity.dto.MultiplierTierSnapshot;
import com.worshiproom.activity.dto.NewBadge;
import com.worshiproom.activity.dto.StreakResult;
import com.worshiproom.activity.dto.StreakSnapshot;
import com.worshiproom.social.MilestoneEventType;
import com.worshiproom.social.MilestoneEventsService;
import com.worshiproom.user.User;
import com.worshiproom.user.UserException;
import com.worshiproom.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Transactional orchestration for the {@code POST /api/v1/activity} endpoint.
 *
 * <p>Composes four pure services
 * ({@link FaithPointsService}, {@link StreakService}, {@link BadgeService},
 * {@link ActivityCountsService}) with five table writes
 * ({@code activity_log}, {@code activity_counts}, {@code faith_points},
 * {@code streak_state}, {@code user_badges}) inside a single transaction.
 *
 * <p>Algorithm (see Spec 2.6 § Architectural Decision #4):
 * <ol>
 *   <li>Resolve the user and build the timezone-aware day window
 *       {@code [windowStart, windowEnd)}.</li>
 *   <li>Detect first-time-today by counting prior {@code activity_log} rows
 *       for {@code (userId, activityType)} in the window — BEFORE any writes.</li>
 *   <li>Always increment the corresponding {@link CountType} counter (when
 *       a mapping exists).</li>
 *   <li>If first-time-today: compute the multiplier-aware points delta via
 *       two {@link FaithPointsService#calculate} calls (oldSet vs newSet),
 *       update {@code faith_points}, update {@code streak_state}, run
 *       badge eligibility, and persist new badges.</li>
 *   <li>If NOT first-time-today (record-only path): synthesize a
 *       {@link StreakTransition#SAME_DAY} result, compute the multiplier
 *       tier from the existing set, and skip points/streak/badge writes.</li>
 *   <li>Always insert the new {@code activity_log} row LAST so the
 *       first-time-today count query above sees pre-insert state.</li>
 * </ol>
 *
 * <p>The {@code activity_log.points_earned} column stores the delta
 * credited by THIS call (non-zero only on the first-time-today path) — not
 * the cumulative day total, not the per-activity base points.
 */
@Service
public class ActivityService {

    private static final Logger log = LoggerFactory.getLogger(ActivityService.class);

    /**
     * The 7 {@link ActivityType} values that map to a {@link CountType}.
     * The other 5 ({@code MOOD}, {@code REFLECTION}, {@code CHALLENGE},
     * {@code LOCAL_VISIT}, {@code DEVOTIONAL}) trigger no count increment
     * via this endpoint (their counters are accumulated by other code paths
     * or do not exist as counters).
     */
    private static final Map<ActivityType, CountType> ACTIVITY_TO_COUNT;
    static {
        Map<ActivityType, CountType> m = new EnumMap<>(ActivityType.class);
        m.put(ActivityType.PRAY,         CountType.PRAY);
        m.put(ActivityType.JOURNAL,      CountType.JOURNAL);
        m.put(ActivityType.MEDITATE,     CountType.MEDITATE);
        m.put(ActivityType.LISTEN,       CountType.LISTEN);
        m.put(ActivityType.PRAYER_WALL,  CountType.PRAYER_WALL);
        m.put(ActivityType.READING_PLAN, CountType.READING_PLAN);
        m.put(ActivityType.GRATITUDE,    CountType.GRATITUDE);
        ACTIVITY_TO_COUNT = Collections.unmodifiableMap(m);
    }

    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final FaithPointsRepository faithPointsRepository;
    private final StreakRepository streakRepository;
    private final BadgeRepository badgeRepository;
    private final FaithPointsService faithPointsService;
    private final StreakService streakService;
    private final BadgeService badgeService;
    private final ActivityCountsService activityCountsService;
    private final MilestoneEventsService milestoneEventsService;

    public ActivityService(UserRepository userRepository,
                           ActivityLogRepository activityLogRepository,
                           FaithPointsRepository faithPointsRepository,
                           StreakRepository streakRepository,
                           BadgeRepository badgeRepository,
                           FaithPointsService faithPointsService,
                           StreakService streakService,
                           BadgeService badgeService,
                           ActivityCountsService activityCountsService,
                           MilestoneEventsService milestoneEventsService) {
        this.userRepository = userRepository;
        this.activityLogRepository = activityLogRepository;
        this.faithPointsRepository = faithPointsRepository;
        this.streakRepository = streakRepository;
        this.badgeRepository = badgeRepository;
        this.faithPointsService = faithPointsService;
        this.streakService = streakService;
        this.badgeService = badgeService;
        this.activityCountsService = activityCountsService;
        this.milestoneEventsService = milestoneEventsService;
    }

    @Transactional
    public ActivityResponseData recordActivity(UUID userId, ActivityRequest request) {
        User user = userRepository.findById(userId).orElseThrow(UserException::userNotFound);

        ZoneId tz = resolveZone(user.getTimezone());
        LocalDate today = LocalDate.now(tz);
        OffsetDateTime windowStart = today.atStartOfDay(tz).toOffsetDateTime();
        OffsetDateTime windowEnd = today.plusDays(1).atStartOfDay(tz).toOffsetDateTime();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        ActivityType type = request.activityType();
        String typeWire = type.wireValue();

        // 1. Determine first-time-today BEFORE any writes
        boolean firstTimeToday = activityLogRepository.countTodaysOccurrences(
            userId, typeWire, windowStart, windowEnd) == 0;

        // 2. Always: increment count if mapping exists
        CountType countType = ACTIVITY_TO_COUNT.get(type);
        if (countType != null) {
            activityCountsService.incrementCount(userId, countType);
        }

        // 3. Load existing state (creates fresh entities if missing)
        FaithPoints fp = faithPointsRepository.findById(userId)
            .orElseGet(() -> new FaithPoints(userId));
        StreakState streakEntity = streakRepository.findById(userId)
            .orElseGet(() -> new StreakState(userId));
        StreakStateData streakData = new StreakStateData(
            streakEntity.getCurrentStreak(),
            streakEntity.getLongestStreak(),
            streakEntity.getLastActiveDate());

        // 4. Branch: full path (firstTimeToday) vs record-only path
        int pointsDelta;
        boolean levelUp;
        int totalPoints;
        int currentLevel;
        StreakResult streakResult;
        List<BadgeDefinition> newBadgeDefs;
        MultiplierTier multiplierTier;

        if (firstTimeToday) {
            // 4a. Compute oldSet from activity_log (pre-insert state)
            Set<ActivityType> oldSet = readTodaysActivityTypes(userId, windowStart, windowEnd);
            Set<ActivityType> newSet = oldSet.isEmpty()
                ? EnumSet.of(type)
                : EnumSet.copyOf(oldSet);
            newSet.add(type);

            // 4b. Two FaithPointsService.calculate calls for the multiplier-aware delta
            FaithPointsResult oldResult = faithPointsService.calculate(oldSet.isEmpty()
                ? EnumSet.noneOf(ActivityType.class) : oldSet, 0);
            FaithPointsResult newResult = faithPointsService.calculate(newSet, 0);
            pointsDelta = newResult.pointsEarned() - oldResult.pointsEarned();
            multiplierTier = newResult.multiplierTier();

            // 4c. Update lifetime points + level
            int previousLevel = fp.getCurrentLevel();
            int newLifetime = fp.getTotalPoints() + pointsDelta;
            LevelInfo levelInfo = LevelThresholds.levelForPoints(newLifetime);
            levelUp = levelInfo.level() > previousLevel;
            fp.setTotalPoints(newLifetime);
            fp.setCurrentLevel(levelInfo.level());
            fp.setLastUpdated(now);
            faithPointsRepository.save(fp);

            // 4d. Update streak
            streakResult = streakService.updateStreak(streakData, today);
            StreakStateData newStreakState = streakResult.newState();
            streakEntity.setCurrentStreak(newStreakState.currentStreak());
            streakEntity.setLongestStreak(newStreakState.longestStreak());
            streakEntity.setLastActiveDate(newStreakState.lastActiveDate());
            streakRepository.save(streakEntity);

            // 4e. Check badges
            BadgeCheckContext context = buildBadgeContext(
                userId, newStreakState, levelInfo.level(), previousLevel, newSet);
            Set<String> alreadyEarned = badgeRepository.findAllByUserId(userId).stream()
                .map(UserBadge::getBadgeId)
                .collect(Collectors.toSet());
            BadgeResult badgeResult = badgeService.checkBadges(context, alreadyEarned);
            newBadgeDefs = badgeResult.newlyEarnedDefinitions();
            persistNewBadges(userId, newBadgeDefs, alreadyEarned);

            // 4f. Emit milestone events (Spec 2.5.4b). All inside the existing
            // @Transactional boundary so the events roll back with the parent.
            // Skipped on the record-only path (firstTimeToday=false) — re-doing
            // an activity already done today does not cross any milestone.

            // LEVEL_UP — single emission per level change.
            if (levelUp) {
                milestoneEventsService.recordEvent(userId, MilestoneEventType.LEVEL_UP,
                    Map.of("newLevel", levelInfo.level()));
            }

            // STREAK_MILESTONE — emit once per threshold crossed by THIS update.
            // "Crossed" means oldStreak < threshold && newStreak >= threshold.
            // A streak reset (newStreak < oldStreak) cannot satisfy the guard,
            // so resets correctly emit nothing.
            int oldStreak = streakData.currentStreak();
            int newStreakDays = newStreakState.currentStreak();
            for (int threshold : BadgeThresholds.STREAK) {
                if (oldStreak < threshold && newStreakDays >= threshold) {
                    milestoneEventsService.recordEvent(userId,
                        MilestoneEventType.STREAK_MILESTONE,
                        Map.of("streakDays", threshold));
                }
            }

            // BADGE_EARNED — one event per entry in newBadgeDefs (BadgeService's
            // applyEarnedFilter has already removed non-repeatable already-earned
            // badges; repeatable badges intentionally remain and emit a fresh
            // event row each time).
            for (BadgeDefinition def : newBadgeDefs) {
                milestoneEventsService.recordEvent(userId,
                    MilestoneEventType.BADGE_EARNED,
                    Map.of("badgeId", def.id()));
            }

            totalPoints = newLifetime;
            currentLevel = levelInfo.level();
        } else {
            // Record-only path: synthesize SAME_DAY result, no points/streak/badge writes
            pointsDelta = 0;
            levelUp = false;
            totalPoints = fp.getTotalPoints();
            currentLevel = fp.getCurrentLevel();
            streakResult = new StreakResult(streakData, StreakTransition.SAME_DAY,
                streakData.currentStreak(), false);
            Set<ActivityType> existingSet = readTodaysActivityTypes(userId, windowStart, windowEnd);
            multiplierTier = MultiplierTiers.forActivityCount(existingSet.size());
            newBadgeDefs = List.of();
        }

        // 5. Always: insert activity_log row (even on record-only path)
        ActivityLog logRow = new ActivityLog(
            userId, typeWire, request.sourceFeature(), now,
            pointsDelta, request.metadata());
        activityLogRepository.save(logRow);

        // 6. Build response
        return buildResponse(pointsDelta, totalPoints, currentLevel, levelUp,
            streakResult, newBadgeDefs, multiplierTier);
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    /**
     * Resolve a user's timezone string to a {@link ZoneId}. Defensive fallback
     * to UTC for blank/null values or unrecognized identifiers — the
     * {@code users.timezone} column is non-nullable with default "UTC", so
     * this branch is only reachable through direct DB seeding (e.g.,
     * JdbcTemplate-based test setup).
     */
    private ZoneId resolveZone(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return ZoneOffset.UTC;
        }
        try {
            return ZoneId.of(timezone);
        } catch (java.time.DateTimeException e) {
            log.warn("Unknown timezone='{}' on user record; defaulting to UTC", timezone);
            return ZoneOffset.UTC;
        }
    }

    private Set<ActivityType> readTodaysActivityTypes(
            UUID userId, OffsetDateTime start, OffsetDateTime end) {
        List<String> wireValues = activityLogRepository.findDistinctActivityTypesToday(
            userId, start, end);
        Set<ActivityType> result = EnumSet.noneOf(ActivityType.class);
        for (String wire : wireValues) {
            try {
                result.add(ActivityType.fromWireValue(wire));
            } catch (IllegalArgumentException e) {
                log.warn("Skipping unknown activity_type='{}' in activity_log for userId={}",
                    wire, userId);
            }
        }
        return result;
    }

    private BadgeCheckContext buildBadgeContext(
            UUID userId, StreakStateData newStreak, int currentLevel, int previousLevel,
            Set<ActivityType> todayActivities) {
        Map<CountType, Integer> counts = activityCountsService.getAllCounts(userId);
        ActivityCountsSnapshot snapshot = new ActivityCountsSnapshot(
            counts.getOrDefault(CountType.PRAY, 0),
            counts.getOrDefault(CountType.JOURNAL, 0),
            counts.getOrDefault(CountType.MEDITATE, 0),
            counts.getOrDefault(CountType.LISTEN, 0),
            counts.getOrDefault(CountType.PRAYER_WALL, 0),
            counts.getOrDefault(CountType.READING_PLAN, 0),
            counts.getOrDefault(CountType.GRATITUDE, 0),
            counts.getOrDefault(CountType.REFLECTION, 0),
            counts.getOrDefault(CountType.ENCOURAGEMENTS_SENT, 0),
            counts.getOrDefault(CountType.FULL_WORSHIP_DAYS, 0),
            counts.getOrDefault(CountType.CHALLENGES_COMPLETED, 0),
            counts.getOrDefault(CountType.INTERCESSION_COUNT, 0),
            counts.getOrDefault(CountType.BIBLE_CHAPTERS_READ, 0),
            counts.getOrDefault(CountType.PRAYER_WALL_POSTS, 0)
        );
        // Per Spec 2.4 Divergence 1: backend has empty data for friendCount,
        // reading plans, bible progress, meditation history, gratitude entries,
        // local visits, listening history during the dual-write phase.
        return new BadgeCheckContext(
            newStreak.currentStreak(),
            newStreak.longestStreak(),
            currentLevel,
            previousLevel,
            todayActivities,
            snapshot,
            0,                                  // friendCount — not in backend yet
            false,                              // allActivitiesWereTrueBefore — not tracked yet
            List.of(),                          // readingPlanProgress — empty
            BibleProgressSnapshot.empty(),
            List.of(),                          // meditationHistory — empty
            GratitudeEntriesSnapshot.empty(),
            LocalVisitsSnapshot.zero(),
            List.of()                           // listeningHistory — empty
        );
    }

    private void persistNewBadges(UUID userId, List<BadgeDefinition> defs,
                                  Set<String> alreadyEarned) {
        for (BadgeDefinition def : defs) {
            if (def.repeatable()) {
                badgeRepository.incrementDisplayCount(userId, def.id());
            } else if (!alreadyEarned.contains(def.id())) {
                badgeRepository.save(new UserBadge(userId, def.id()));
            }
            // Non-repeatable AND already earned: BadgeService should have
            // filtered these out via applyEarnedFilter; guard defensively.
        }
    }

    private ActivityResponseData buildResponse(
            int pointsDelta, int totalPoints, int currentLevel, boolean levelUp,
            StreakResult streakResult, List<BadgeDefinition> newBadgeDefs,
            MultiplierTier tier) {
        StreakStateData s = streakResult.newState();
        boolean newToday = streakResult.transition() != StreakTransition.SAME_DAY;
        StreakSnapshot streak = new StreakSnapshot(
            s.currentStreak(), s.longestStreak(), newToday, 0, 0);

        OffsetDateTime nowEarned = OffsetDateTime.now(ZoneOffset.UTC);
        List<NewBadge> newBadges = newBadgeDefs.stream()
            .map(d -> new NewBadge(d.id(), d.name(), d.celebrationTier(), nowEarned))
            .toList();

        MultiplierTierSnapshot multiplierSnap = new MultiplierTierSnapshot(
            tier.label(), tier.multiplier());

        return new ActivityResponseData(
            pointsDelta, totalPoints, currentLevel, levelUp,
            streak, newBadges, multiplierSnap);
    }
}
