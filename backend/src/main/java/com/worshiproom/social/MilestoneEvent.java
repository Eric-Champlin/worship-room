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
 * Maps the {@code milestone_events} table created by Liquibase changeset
 * 2026-04-27-012. One row per milestone the user crosses.
 *
 * <p>{@code event_metadata} JSONB carries type-specific fields:
 * <ul>
 *   <li>{@code STREAK_MILESTONE}: {@code { "streakDays": N }}</li>
 *   <li>{@code LEVEL_UP}: {@code { "newLevel": N }}</li>
 *   <li>{@code BADGE_EARNED}: {@code { "badgeId": "..." }}</li>
 *   <li>{@code FRIEND_MILESTONE}: {@code { "friendCount": N }}</li>
 * </ul>
 *
 * <p>Inserted by {@link com.worshiproom.activity.ActivityService#recordActivity}
 * (LEVEL_UP / STREAK_MILESTONE / BADGE_EARNED) and by
 * {@link com.worshiproom.friends.FriendsService#acceptRequest} (FRIEND_MILESTONE),
 * always within the caller's existing {@code @Transactional} boundary.
 */
@Entity
@Table(name = "milestone_events")
public class MilestoneEvent {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Convert(converter = MilestoneEventTypeConverter.class)
    @Column(name = "event_type", nullable = false, length = 40, updatable = false)
    private MilestoneEventType eventType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "event_metadata", columnDefinition = "jsonb")
    private Map<String, Object> eventMetadata;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private OffsetDateTime occurredAt;

    protected MilestoneEvent() {}

    public MilestoneEvent(UUID userId, MilestoneEventType eventType,
                          Map<String, Object> eventMetadata) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.eventType = eventType;
        this.eventMetadata = eventMetadata;
        // Client-side timestamp matches ActivityLog pattern; the schema's
        // DB default NOW() remains as a backstop for direct INSERT seeds.
        this.occurredAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public MilestoneEventType getEventType() { return eventType; }
    public Map<String, Object> getEventMetadata() { return eventMetadata; }
    public OffsetDateTime getOccurredAt() { return occurredAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MilestoneEvent other)) return false;
        return Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }

    @Override
    public String toString() {
        return "MilestoneEvent{id=" + id
             + ", userId=" + userId
             + ", eventType=" + eventType
             + ", occurredAt=" + occurredAt + "}";
    }
}
