package com.worshiproom.post.engagement;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Read-only JPA mapping for {@code post_reactions} (Spec 3.1 changeset 016).
 *
 * <p>{@code reactionType} is bound as a plain {@link String} (not an enum)
 * because Phase 6.6 Answered Wall will widen the underlying CHECK constraint
 * to add {@code 'praising'} / {@code 'celebrate'}; an enum bound to that
 * column would need an ALTER mid-flight. See Spec 3.4 § Step 1 Details.
 */
@Entity
@Table(name = "post_reactions")
@IdClass(PostReactionId.class)
public class PostReaction {

    @Id
    @Column(name = "post_id", nullable = false, updatable = false)
    private UUID postId;

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Id
    @Column(name = "reaction_type", nullable = false, updatable = false, length = 30)
    private String reactionType;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected PostReaction() {}

    public PostReaction(UUID postId, UUID userId, String reactionType) {
        this.postId = postId;
        this.userId = userId;
        this.reactionType = reactionType;
    }

    public UUID getPostId() { return postId; }
    public UUID getUserId() { return userId; }
    public String getReactionType() { return reactionType; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PostReaction other)) return false;
        return Objects.equals(postId, other.postId)
                && Objects.equals(userId, other.userId)
                && Objects.equals(reactionType, other.reactionType);
    }

    @Override
    public int hashCode() {
        return Objects.hash(postId, userId, reactionType);
    }
}
