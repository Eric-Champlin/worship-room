package com.worshiproom.social;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * Single-method service for inserting milestone-event rows. Called by
 * {@link com.worshiproom.activity.ActivityService} (LEVEL_UP /
 * STREAK_MILESTONE / BADGE_EARNED) and
 * {@link com.worshiproom.friends.FriendsService} (FRIEND_MILESTONE).
 *
 * <p>No {@code @Transactional} annotation here — every caller is already
 * inside an existing {@code @Transactional} boundary, and the event row
 * MUST roll back with the parent transaction (Universal Rule: a milestone
 * event without the underlying state change is a phantom).
 */
@Service
public class MilestoneEventsService {

    private final MilestoneEventRepository repository;

    public MilestoneEventsService(MilestoneEventRepository repository) {
        this.repository = repository;
    }

    /**
     * Persist a milestone event row. Caller MUST be inside an existing
     * {@code @Transactional} boundary so the event participates in rollback
     * semantics with whatever upstream operation triggered it.
     *
     * @param userId     the user the milestone was crossed by
     * @param type       the milestone discriminator (matches the DB CHECK)
     * @param metadata   JSONB payload; type-specific (e.g.,
     *                   {@code {"newLevel": 3}}, {@code {"streakDays": 7}},
     *                   {@code {"badgeId": "first_prayer"}},
     *                   {@code {"friendCount": 1}})
     */
    public void recordEvent(UUID userId, MilestoneEventType type, Map<String, Object> metadata) {
        MilestoneEvent event = new MilestoneEvent(userId, type, metadata);
        repository.save(event);
    }
}
