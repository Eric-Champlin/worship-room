package com.worshiproom.post.engagement;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite-PK class for {@link PostReaction}. Mirrors the
 * {@code com.worshiproom.mute.UserMuteId} shape.
 */
public class PostReactionId implements Serializable {

    private UUID postId;
    private UUID userId;
    private String reactionType;

    public PostReactionId() {}

    public PostReactionId(UUID postId, UUID userId, String reactionType) {
        this.postId = postId;
        this.userId = userId;
        this.reactionType = reactionType;
    }

    public UUID getPostId() { return postId; }
    public UUID getUserId() { return userId; }
    public String getReactionType() { return reactionType; }

    public void setPostId(UUID postId) { this.postId = postId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public void setReactionType(String reactionType) { this.reactionType = reactionType; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PostReactionId other)) return false;
        return Objects.equals(postId, other.postId)
                && Objects.equals(userId, other.userId)
                && Objects.equals(reactionType, other.reactionType);
    }

    @Override
    public int hashCode() {
        return Objects.hash(postId, userId, reactionType);
    }

    @Override
    public String toString() {
        return "PostReactionId{postId=" + postId
             + ", userId=" + userId
             + ", reactionType=" + reactionType + "}";
    }
}
