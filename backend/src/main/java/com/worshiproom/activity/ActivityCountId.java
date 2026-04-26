package com.worshiproom.activity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite primary key class for {@link ActivityCount}, mirroring the
 * {@code (user_id, count_type)} primary key declared by Spec 2.1's Liquibase
 * changeset {@code 2026-04-25-007-create-activity-counts-table.xml}.
 *
 * <p>Required by JPA when {@link ActivityCount} uses {@code @IdClass}. Field
 * names and types MUST match the corresponding {@code @Id} fields on the
 * entity (i.e., {@code userId : UUID} and {@code countType : String}).
 *
 * <p>{@code countType} is stored as the wire-format string (e.g.,
 * {@code "prayerWall"}), NOT the {@link CountType} enum value. The enum
 * lives in the application layer; the DB sees the string.
 *
 * <p>Implements {@link Serializable} as JPA mandates for ID classes.
 * Equals/hashCode are value-based on both fields (NOT primary-key-only
 * like the entity itself — for an ID class the whole class IS the key).
 *
 * <p>Style mirrors {@link UserBadgeId}.
 */
public class ActivityCountId implements Serializable {

    private UUID userId;
    private String countType;

    public ActivityCountId() {}

    public ActivityCountId(UUID userId, String countType) {
        this.userId = userId;
        this.countType = countType;
    }

    public UUID getUserId() { return userId; }
    public String getCountType() { return countType; }

    public void setUserId(UUID userId) { this.userId = userId; }
    public void setCountType(String countType) { this.countType = countType; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ActivityCountId other)) return false;
        return Objects.equals(userId, other.userId) && Objects.equals(countType, other.countType);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, countType);
    }

    @Override
    public String toString() {
        return "ActivityCountId{userId=" + userId + ", countType='" + countType + "'}";
    }
}
