package com.worshiproom.post.engagement;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite-PK class for {@link PostBookmark}. Mirrors the
 * {@code com.worshiproom.mute.UserMuteId} shape.
 */
public class PostBookmarkId implements Serializable {

    private UUID postId;
    private UUID userId;

    public PostBookmarkId() {}

    public PostBookmarkId(UUID postId, UUID userId) {
        this.postId = postId;
        this.userId = userId;
    }

    public UUID getPostId() { return postId; }
    public UUID getUserId() { return userId; }

    public void setPostId(UUID postId) { this.postId = postId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PostBookmarkId other)) return false;
        return Objects.equals(postId, other.postId) && Objects.equals(userId, other.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(postId, userId);
    }

    @Override
    public String toString() {
        return "PostBookmarkId{postId=" + postId + ", userId=" + userId + "}";
    }
}
