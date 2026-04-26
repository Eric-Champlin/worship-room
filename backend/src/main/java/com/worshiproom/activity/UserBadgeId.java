package com.worshiproom.activity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite primary key class for {@link UserBadge}, mirroring the
 * {@code (user_id, badge_id)} primary key declared by Spec 2.1's Liquibase
 * changeset {@code 2026-04-25-006-create-user-badges-table.xml}.
 *
 * <p>Required by JPA when {@link UserBadge} uses {@code @IdClass}. Field
 * names and types MUST match the corresponding {@code @Id} fields on the
 * entity (i.e., {@code userId : UUID} and {@code badgeId : String}).
 *
 * <p>Implements {@link Serializable} as JPA mandates for ID classes.
 * Equals/hashCode are value-based on both fields (NOT primary-key-only
 * like the entity itself — for an ID class the whole class IS the key).
 */
public class UserBadgeId implements Serializable {

    private UUID userId;
    private String badgeId;

    public UserBadgeId() {}

    public UserBadgeId(UUID userId, String badgeId) {
        this.userId = userId;
        this.badgeId = badgeId;
    }

    public UUID getUserId() { return userId; }
    public String getBadgeId() { return badgeId; }

    public void setUserId(UUID userId) { this.userId = userId; }
    public void setBadgeId(String badgeId) { this.badgeId = badgeId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserBadgeId other)) return false;
        return Objects.equals(userId, other.userId) && Objects.equals(badgeId, other.badgeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, badgeId);
    }

    @Override
    public String toString() {
        return "UserBadgeId{userId=" + userId + ", badgeId='" + badgeId + "'}";
    }
}
