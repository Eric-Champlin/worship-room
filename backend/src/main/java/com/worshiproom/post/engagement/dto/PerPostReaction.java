package com.worshiproom.post.engagement.dto;

/**
 * Per-post engagement summary for the viewer.
 *
 * <p>Spec 3.7 added {@code isCandle} alongside {@code isPraying} and
 * {@code isBookmarked}. Future reaction types (Phase 6.6 Answered Wall:
 * 'praising', 'celebrate') will extend this DTO further.
 */
public record PerPostReaction(boolean isPraying, boolean isCandle, boolean isBookmarked) {}
