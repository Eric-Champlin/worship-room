package com.worshiproom.quicklift;

import com.worshiproom.activity.ActivityService;
import com.worshiproom.activity.ActivityType;
import com.worshiproom.activity.dto.ActivityRequest;
import com.worshiproom.activity.dto.ActivityResponseData;
import com.worshiproom.activity.dto.NewBadge;
import com.worshiproom.post.PostRepository;
import com.worshiproom.quicklift.dto.QuickLiftCompleteResponse;
import com.worshiproom.quicklift.dto.QuickLiftStartResponse;
import jakarta.persistence.EntityManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Orchestration for Quick Lift sessions (Spec 6.2). The {@link #complete}
 * method records the {@code QUICK_LIFT} activity INSIDE the same transaction
 * that marks the session terminal — if activity recording throws, both the
 * session UPDATE and the activity write roll back (W7 atomicity guarantee).
 *
 * <p>Timing is server-authoritative: {@code started_at} comes from the DB
 * via {@code DEFAULT NOW()} (immune to JVM clock drift at insertion) and the
 * 30-second dwell check uses {@code OffsetDateTime.now(UTC)} in the
 * application — acceptable because Railway containers run NTP-synced and
 * 50ms drift is negligible against a 30,000ms window.
 */
@Service
public class QuickLiftService {

    private static final Logger log = LoggerFactory.getLogger(QuickLiftService.class);
    static final long MINIMUM_DWELL_MS = 30_000L;

    private final QuickLiftSessionRepository sessionRepository;
    private final PostRepository postRepository;
    private final ActivityService activityService;
    private final EntityManager entityManager;
    private final QuickLiftStartRateLimitService startRateLimit;
    private final QuickLiftCompleteRateLimitService completeRateLimit;

    public QuickLiftService(
            QuickLiftSessionRepository sessionRepository,
            PostRepository postRepository,
            ActivityService activityService,
            EntityManager entityManager,
            QuickLiftStartRateLimitService startRateLimit,
            QuickLiftCompleteRateLimitService completeRateLimit) {
        this.sessionRepository = sessionRepository;
        this.postRepository = postRepository;
        this.activityService = activityService;
        this.entityManager = entityManager;
        this.startRateLimit = startRateLimit;
        this.completeRateLimit = completeRateLimit;
    }

    @Transactional
    public QuickLiftStartResponse start(UUID userId, UUID postId) {
        startRateLimit.checkAndConsume(userId);

        if (!postRepository.existsById(postId)) {
            throw QuickLiftException.notFound();
        }

        if (sessionRepository.findActiveByUserAndPost(userId, postId).isPresent()) {
            throw QuickLiftException.activeSessionExists();
        }

        QuickLiftSession session = new QuickLiftSession(userId, postId);
        // saveAndFlush ensures the SQL INSERT lands in the DB before refresh()
        // looks for the row. L1-cache trap: started_at is DB-default +
        // insertable=false, so without refresh saved.getStartedAt() returns
        // null. Phase 3 Execution Reality Addendum item 2.
        QuickLiftSession saved = sessionRepository.saveAndFlush(session);
        entityManager.refresh(saved);

        log.info("Quick Lift started sessionId={}", saved.getId());

        return new QuickLiftStartResponse(saved.getId(), saved.getStartedAt());
    }

    @Transactional
    public QuickLiftCompleteResponse complete(UUID userId, UUID sessionId) {
        completeRateLimit.checkAndConsume(userId);

        QuickLiftSession session = sessionRepository.findById(sessionId)
            .orElseThrow(QuickLiftException::notFound);

        // Cross-user attempt: 403, not 404 — do not leak existence (W3).
        if (!session.getUserId().equals(userId)) {
            throw QuickLiftException.forbidden();
        }

        // If already terminal, fall through to atomic UPDATE — affected=0 →
        // 409. (Explicit pre-check would race with concurrent calls.)
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        long elapsedMs = Duration.between(session.getStartedAt(), now).toMillis();
        if (elapsedMs < MINIMUM_DWELL_MS) {
            throw QuickLiftException.timingTooEarly();
        }

        int affected = sessionRepository.markCompleted(sessionId, userId, now);
        if (affected == 0) {
            throw QuickLiftException.alreadyCompleted();
        }

        // Activity recording INSIDE the same transaction (W7 atomicity).
        ActivityRequest req = new ActivityRequest(
            ActivityType.QUICK_LIFT,
            "quickLift-overlay",
            Map.of("postId", session.getPostId().toString())
        );
        ActivityResponseData activity = activityService.recordActivity(userId, req);

        List<NewBadge> badges = activity.newBadges();
        int pointsAwarded = activity.pointsEarned();

        log.info("Quick Lift completed sessionId={} pointsAwarded={} badgesUnlocked={}",
            sessionId, pointsAwarded, badges.size());

        return new QuickLiftCompleteResponse(true, pointsAwarded, badges);
    }
}
