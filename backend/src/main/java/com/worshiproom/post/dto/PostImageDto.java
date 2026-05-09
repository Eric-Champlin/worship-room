package com.worshiproom.post.dto;

/**
 * Nested image block in {@link PostDto} (Spec 4.6b).
 *
 * <p>Three presigned-GET URLs (full / medium / thumb) plus the alt text. URLs
 * expire after {@code worshiproom.storage.max-presign-hours} (default 1h) —
 * never persisted, regenerated on every PostMapper serialization.
 */
public record PostImageDto(
        String fullUrl,
        String mediumUrl,
        String thumbUrl,
        String altText
) {}
