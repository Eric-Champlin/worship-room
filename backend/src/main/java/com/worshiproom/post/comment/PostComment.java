package com.worshiproom.post.comment;

import com.worshiproom.post.ModerationStatus;
import com.worshiproom.post.ModerationStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Read-only JPA mapping for {@code post_comments} (Spec 3.1 changeset 015).
 *
 * <p>Spec 3.4 ships read endpoints only — write operations are added in
 * Spec 3.6. Timestamps and {@code id} are DB-managed; do not write them
 * from application code.
 */
@Entity
@Table(name = "post_comments")
public class PostComment {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "parent_comment_id")
    private UUID parentCommentId;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_helpful", nullable = false)
    private boolean isHelpful;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Convert(converter = ModerationStatusConverter.class)
    @Column(name = "moderation_status", nullable = false, length = 20)
    private ModerationStatus moderationStatus;

    @Column(name = "crisis_flag", nullable = false)
    private boolean crisisFlag;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime updatedAt;

    protected PostComment() {}

    public UUID getId() { return id; }
    public UUID getPostId() { return postId; }
    public UUID getUserId() { return userId; }
    public UUID getParentCommentId() { return parentCommentId; }
    public String getContent() { return content; }
    public boolean isHelpful() { return isHelpful; }
    public boolean isDeleted() { return isDeleted; }
    public OffsetDateTime getDeletedAt() { return deletedAt; }
    public ModerationStatus getModerationStatus() { return moderationStatus; }
    public boolean isCrisisFlag() { return crisisFlag; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PostComment other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
