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
 * Read-only JPA mapping for {@code post_bookmarks} (Spec 3.1 changeset 017).
 *
 * <p>Composite PK is {@code (post_id, user_id)} — a user has at most one
 * bookmark per post. {@code created_at} is DB-managed.
 */
@Entity
@Table(name = "post_bookmarks")
@IdClass(PostBookmarkId.class)
public class PostBookmark {

    @Id
    @Column(name = "post_id", nullable = false, updatable = false)
    private UUID postId;

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected PostBookmark() {}

    public PostBookmark(UUID postId, UUID userId) {
        this.postId = postId;
        this.userId = userId;
    }

    public UUID getPostId() { return postId; }
    public UUID getUserId() { return userId; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PostBookmark other)) return false;
        return Objects.equals(postId, other.postId) && Objects.equals(userId, other.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(postId, userId);
    }
}
