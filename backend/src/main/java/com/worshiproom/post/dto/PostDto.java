package com.worshiproom.post.dto;

import java.time.OffsetDateTime;
import java.util.Set;
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
        int praisingCount,
        int celebrateCount,
        int commentCount,
        int bookmarkCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime lastActivityAt,
        AuthorDto author,
        UUID questionResolvedCommentId,
        // Spec 4.6b — null when post has no image attached. Global Jackson
        // default-property-inclusion=non_null drops the field from the wire format
        // when null.
        PostImageDto image,
        // Spec 4.7b — always present (empty Set when no tags). Canonical order
        // (LinkedHashSet preserves the server's canonical sort).
        Set<String> helpTags,
        // Spec 6.5 — populated only by feed endpoint (listFeed). Null on
        // getById and listAuthorPosts. Global Jackson default-property-inclusion
        // = non_null drops the field from the wire format when null.
        IntercessorSummary intercessorSummary,
        // Spec 7.6 — true when this post is one of up to 3 friend posts
        // pinned to the top of the main feed for the requesting viewer.
        // False everywhere else (single-post fetch, author-posts feed,
        // Answered Wall, chronological remainder on the main feed). Per-
        // viewer; not cacheable across viewers.
        boolean isFromFriend
) {}
