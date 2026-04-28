package com.worshiproom.post.engagement.dto;

/**
 * Response body for {@code POST /api/v1/posts/{id}/bookmark} (Spec 3.7 D2).
 *
 * <p>{@code bookmarked} is always {@code true} on POST (the operation either
 * inserted or no-op'd; either way the user is now bookmarked). Status code
 * disambiguates: 201 = newly inserted, 200 = idempotent no-op (already
 * bookmarked).
 *
 * <p>{@code bookmarkCount} is the post-mutation count for the parent post.
 *
 * <p>{@code DELETE /api/v1/posts/{id}/bookmark} returns 204 with NO body —
 * BookmarkResponse is not used on the DELETE path.
 */
public record BookmarkResponse(boolean bookmarked, int bookmarkCount) {}
