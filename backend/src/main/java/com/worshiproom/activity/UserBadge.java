package com.worshiproom.activity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Objects;
import java.util.UUID;

/**
 * Per-user earned badge with composite key {@code (user_id, badge_id)}.
 *
 * <p>Maps to the {@code user_badges} table created by Spec 2.1's Liquibase
 * changeset {@code 2026-04-25-006-create-user-badges-table.xml}. The named
 * CHECK constraint {@code user_badges_display_count_positive_check} enforces
 * {@code display_count >= 1} at the DB level; {@link Min}{@code (1)} mirrors
 * it at the application layer.
 *
 * <p>Composite key declared via {@link IdClass}({@link UserBadgeId}).
 * Both {@code @Id}-tagged fields here MUST match {@code UserBadgeId}'s
 * field names and types exactly.
 *
 * <p>The {@code user_id} foreign key references {@code users.id} with
 * {@code ON DELETE CASCADE} per the changeset; that cascade is owned by
 * the DB, not by this entity.
 *
 * <p>Style mirrors {@link FaithPoints} and {@link StreakState}: manual
 * getters/setters, no Lombok, equals/hashCode by primary key (the
 * composite of userId + badgeId).
 *
 * <p>Scaffolding only for Spec 2.4 — {@link BadgeService} does not consume
 * this entity. Spec 2.6 will inject {@link BadgeRepository} and use this
 * entity for persistence (including {@code display_count} increment for
 * repeatable badges).
 */
@Entity
@Table(name = "user_badges")
@IdClass(UserBadgeId.class)
public class UserBadge {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Id
    @Column(name = "badge_id", nullable = false, updatable = false, length = 100)
    private String badgeId;

    @Column(name = "earned_at", nullable = false)
    private OffsetDateTime earnedAt;

    @Min(1)
    @Column(name = "display_count", nullable = false)
    private int displayCount = 1;

    protected UserBadge() {}

    public UserBadge(UUID userId, String badgeId) {
        this.userId = userId;
        this.badgeId = badgeId;
        this.earnedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getUserId() { return userId; }
    public String getBadgeId() { return badgeId; }
    public OffsetDateTime getEarnedAt() { return earnedAt; }
    public int getDisplayCount() { return displayCount; }

    public void setEarnedAt(OffsetDateTime earnedAt) { this.earnedAt = earnedAt; }
    public void setDisplayCount(int displayCount) { this.displayCount = displayCount; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserBadge other)) return false;
        return Objects.equals(userId, other.userId) && Objects.equals(badgeId, other.badgeId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, badgeId);
    }

    @Override
    public String toString() {
        return "UserBadge{userId=" + userId
             + ", badgeId='" + badgeId + "'"
             + ", earnedAt=" + earnedAt
             + ", displayCount=" + displayCount + "}";
    }
}
