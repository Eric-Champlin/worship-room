package com.worshiproom.post.engagement.dto;

/**
 * Per-post engagement summary for the viewer.
 *
 * <p>Spec 3.7 added {@code isCandle} alongside {@code isPraying} and
 * {@code isBookmarked}. Spec 6.6 Answered Wall added {@code isPraising}
 * for the praising reaction (placed adjacent to the other reaction-type
 * booleans). Future {@code 'celebrate'} support is deferred.
 */
public record PerPostReaction(boolean isPraying, boolean isCandle, boolean isPraising, boolean isBookmarked) {}
