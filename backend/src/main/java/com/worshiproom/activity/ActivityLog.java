package com.worshiproom.activity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Per-action activity log row. One row per call to {@code POST /api/v1/activity},
 * created on every successful invocation regardless of first-time-today gating.
 *
 * <p>Maps to the {@code activity_log} table created by Spec 2.1's Liquibase
 * changeset {@code 2026-04-25-003-create-activity-log-table.xml}. The
 * {@code user_id} foreign key references {@code users.id} with
 * {@code ON DELETE CASCADE} per the changeset; that cascade is owned by the
 * DB, not by this entity.
 *
 * <p>{@code activity_type} stores the wire-format string (e.g., "pray",
 * "prayerWall") rather than the SCREAMING_SNAKE_CASE Java enum name, so the
 * Java enum can be renamed without a migration. Conversion to/from
 * {@link ActivityType} happens in the service layer via
 * {@link ActivityType#wireValue()} / {@link ActivityType#fromWireValue}.
 *
 * <p>The {@code metadata} JSONB column is the first JSONB usage in the
 * codebase. The Hibernate 6 native pattern uses
 * {@link JdbcTypeCode}({@link SqlTypes#JSON}) — no {@code hibernate-types}
 * dependency required.
 *
 * <p>Style mirrors {@link FaithPoints} and {@link StreakState}: manual
 * getters/setters, no Lombok, equals/hashCode by primary key (UUID id).
 */
@Entity
@Table(name = "activity_log")
public class ActivityLog {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "activity_type", nullable = false, length = 50, updatable = false)
    private String activityType;

    @Column(name = "source_feature", nullable = false, length = 50, updatable = false)
    private String sourceFeature;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private OffsetDateTime occurredAt;

    @Min(0)
    @Column(name = "points_earned", nullable = false)
    private int pointsEarned;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    protected ActivityLog() {}

    public ActivityLog(UUID userId, String activityType, String sourceFeature,
                       OffsetDateTime occurredAt, int pointsEarned,
                       Map<String, Object> metadata) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.activityType = activityType;
        this.sourceFeature = sourceFeature;
        this.occurredAt = occurredAt;
        this.pointsEarned = pointsEarned;
        this.metadata = metadata;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getActivityType() { return activityType; }
    public String getSourceFeature() { return sourceFeature; }
    public OffsetDateTime getOccurredAt() { return occurredAt; }
    public int getPointsEarned() { return pointsEarned; }
    public Map<String, Object> getMetadata() { return metadata; }

    public void setPointsEarned(int pointsEarned) { this.pointsEarned = pointsEarned; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ActivityLog other)) return false;
        return Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }

    @Override
    public String toString() {
        return "ActivityLog{id=" + id
             + ", userId=" + userId
             + ", activityType='" + activityType + "'"
             + ", sourceFeature='" + sourceFeature + "'"
             + ", occurredAt=" + occurredAt
             + ", pointsEarned=" + pointsEarned + "}";
    }
}
