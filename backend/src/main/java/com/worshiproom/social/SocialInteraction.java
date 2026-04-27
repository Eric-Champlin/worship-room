package com.worshiproom.social;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Maps the {@code social_interactions} table created by Liquibase changeset
 * 2026-04-27-011. One row per encouragement, nudge, or recap dismissal.
 *
 * <p>{@code payload} is JSONB:
 * <ul>
 *   <li>encouragement: {@code { "message": "..." }}</li>
 *   <li>nudge: {@code null} (no body required)</li>
 *   <li>recap_dismissal: {@code { "weekStart": "YYYY-MM-DD" }}</li>
 * </ul>
 *
 * <p>Note: the schema requires {@code to_user_id NOT NULL}; for recap
 * dismissals, callers set {@code to_user_id = from_user_id} (self-row).
 * See {@link SocialInteractionsService#dismissRecap}.
 *
 * <p>JSONB serialization uses the Hibernate 6 native pattern
 * ({@link JdbcTypeCode}+{@link SqlTypes#JSON}) — same as
 * {@link com.worshiproom.activity.ActivityLog#getMetadata}.
 */
@Entity
@Table(name = "social_interactions")
public class SocialInteraction {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "from_user_id", nullable = false, updatable = false)
    private UUID fromUserId;

    @Column(name = "to_user_id", nullable = false, updatable = false)
    private UUID toUserId;

    @Convert(converter = SocialInteractionTypeConverter.class)
    @Column(name = "interaction_type", nullable = false, length = 20, updatable = false)
    private SocialInteractionType interactionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", columnDefinition = "jsonb")
    private Map<String, Object> payload;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected SocialInteraction() {}

    public SocialInteraction(UUID fromUserId, UUID toUserId,
                             SocialInteractionType interactionType,
                             Map<String, Object> payload) {
        this.id = UUID.randomUUID();
        this.fromUserId = fromUserId;
        this.toUserId = toUserId;
        this.interactionType = interactionType;
        this.payload = payload;
        // Client-side timestamp matches ActivityLog/MilestoneEvent pattern:
        // populated immediately so callers (controllers) can serialize the
        // value without a re-fetch round trip. The schema's DB default
        // NOW() remains as a backstop for direct INSERTs (test seeds).
        this.createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() { return id; }
    public UUID getFromUserId() { return fromUserId; }
    public UUID getToUserId() { return toUserId; }
    public SocialInteractionType getInteractionType() { return interactionType; }
    public Map<String, Object> getPayload() { return payload; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SocialInteraction other)) return false;
        return Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }

    @Override
    public String toString() {
        return "SocialInteraction{id=" + id
             + ", fromUserId=" + fromUserId
             + ", toUserId=" + toUserId
             + ", interactionType=" + interactionType
             + ", createdAt=" + createdAt + "}";
    }
}
