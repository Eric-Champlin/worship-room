package com.worshiproom.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialInteractionRepository extends JpaRepository<SocialInteraction, UUID> {

    /** Hourly cap query — count from sender within the last hour, scoped to one type. */
    long countByFromUserIdAndInteractionTypeAndCreatedAtGreaterThanEqual(
        UUID fromUserId, SocialInteractionType interactionType, OffsetDateTime since);

    /** Per-friend daily cap query — count from sender to specific recipient within window. */
    long countByFromUserIdAndToUserIdAndInteractionTypeAndCreatedAtGreaterThanEqual(
        UUID fromUserId, UUID toUserId, SocialInteractionType interactionType, OffsetDateTime since);

    /** Most-recent-nudge lookup for cooldown enforcement. */
    Optional<SocialInteraction> findFirstByFromUserIdAndToUserIdAndInteractionTypeOrderByCreatedAtDesc(
        UUID fromUserId, UUID toUserId, SocialInteractionType interactionType);
}
