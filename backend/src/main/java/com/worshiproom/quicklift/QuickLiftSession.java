package com.worshiproom.quicklift;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Quick Lift session — a 30-second server-authoritative prayer dwell on a
 * Prayer Wall post (Spec 6.2). Two terminal states: {@code completed_at}
 * (success) or {@code cancelled_at} (abandoned). A DB CHECK constraint
 * (quick_lift_sessions_not_both_terminal) prevents both terminals from
 * being set on the same row.
 *
 * <p>{@code startedAt} is owned by Postgres via {@code DEFAULT NOW()} and is
 * marked {@code insertable=false} so Hibernate omits it from INSERT. The
 * canonical {@link QuickLiftService#start} reads it back by calling
 * {@code entityManager.refresh(saved)} after {@code save()} — without that,
 * the in-memory entity holds {@code null} for {@code startedAt} despite the
 * SQL INSERT populating the column. See Phase 3 Execution Reality Addendum
 * item 2 and the L1-cache trap test guard.
 *
 * <p>No setters for terminal timestamps. Completion uses the repository's
 * {@code markCompleted} bulk UPDATE with a {@code WHERE completed_at IS NULL}
 * guard — concurrent complete attempts produce exactly one success.
 */
@Entity
@Table(name = "quick_lift_sessions")
public class QuickLiftSession {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "post_id", nullable = false, updatable = false)
    private UUID postId;

    @Column(name = "started_at", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    protected QuickLiftSession() {
        // Required by JPA
    }

    public QuickLiftSession(UUID userId, UUID postId) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.postId = postId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getPostId() {
        return postId;
    }

    public OffsetDateTime getStartedAt() {
        return startedAt;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public OffsetDateTime getCancelledAt() {
        return cancelledAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof QuickLiftSession other)) return false;
        return Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
