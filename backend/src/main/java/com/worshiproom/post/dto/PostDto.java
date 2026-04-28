package com.worshiproom.post.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Outbound post representation.
 *
 * <p>Excludes {@code is_deleted}, {@code deleted_at} (filtered upstream by
 * visibility predicate; never reach the mapper) and {@code report_count}
 * (moderation-internal — Spec 3.3 Watch-For #14).
 */
public record PostDto(
        UUID id,
        String postType,
        String content,
        String category,
        boolean isAnonymous,
        String challengeId,
        String qotdId,
        String scriptureReference,
        String scriptureText,
        String visibility,
        boolean isAnswered,
        String answeredText,
        OffsetDateTime answeredAt,
        String moderationStatus,
        boolean crisisFlag,
        int prayingCount,
        int candleCount,
        int commentCount,
        int bookmarkCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime lastActivityAt,
        AuthorDto author
) {}
