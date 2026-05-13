package com.worshiproom.post.engagement;

import java.time.Instant;
import java.util.UUID;

/**
 * Spec 6.5 projection for {@link ReactionRepository#findTopNPerPost}. Spring
 * Data maps native SQL columns to this interface by name — snake_case columns
 * map to camelCase getters via standard Spring Data conventions
 * ({@code post_id} → {@code getPostId}).
 *
 * <p>{@code createdAt} is exposed as {@link Instant} (not {@code OffsetDateTime})
 * because the PostgreSQL JDBC driver projects {@code TIMESTAMP WITH TIME ZONE}
 * to {@code Instant} for native queries, and Spring Data's projection layer
 * cannot auto-convert {@code Instant → OffsetDateTime} without a registered
 * converter. The service layer wraps the {@code Instant} into
 * {@code OffsetDateTime} via {@link Instant#atOffset} before constructing
 * {@code IntercessorEntry}.
 */
public interface ReactionTopProjection {
    UUID getPostId();
    UUID getUserId();
    Instant getCreatedAt();
}
