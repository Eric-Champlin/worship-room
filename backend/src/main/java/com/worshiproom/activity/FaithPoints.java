package com.worshiproom.activity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Cumulative faith points and current level per user.
 *
 * <p>Maps to the {@code faith_points} table created by Spec 2.1's Liquibase
 * changeset {@code 2026-04-25-004-create-faith-points-table.xml}. The named
 * CHECK constraints {@code faith_points_total_points_nonneg_check} and
 * {@code faith_points_current_level_positive_check} enforce non-negativity
 * at the DB level; {@link Min} mirrors them at the application layer.
 *
 * <p>The {@code user_id} primary key is also a foreign key to {@code users.id}
 * with {@code ON DELETE CASCADE}. Value comes from the caller (Spec 2.6
 * controller), not from {@code UUID.randomUUID()} — there is no
 * {@code @PrePersist} hook on this entity.
 *
 * <p>Style mirrors {@link com.worshiproom.user.User}: manual getters/setters,
 * no Lombok, equals/hashCode by primary key.
 */
@Entity
@Table(name = "faith_points")
public class FaithPoints {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Min(0)
    @Column(name = "total_points", nullable = false)
    private int totalPoints = 0;

    @Min(1)
    @Column(name = "current_level", nullable = false)
    private int currentLevel = 1;

    @Column(name = "last_updated", nullable = false)
    private OffsetDateTime lastUpdated;

    protected FaithPoints() {}

    public FaithPoints(UUID userId) {
        this.userId = userId;
        this.lastUpdated = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getUserId() { return userId; }
    public int getTotalPoints() { return totalPoints; }
    public int getCurrentLevel() { return currentLevel; }
    public OffsetDateTime getLastUpdated() { return lastUpdated; }

    public void setTotalPoints(int totalPoints) { this.totalPoints = totalPoints; }
    public void setCurrentLevel(int currentLevel) { this.currentLevel = currentLevel; }
    public void setLastUpdated(OffsetDateTime lastUpdated) { this.lastUpdated = lastUpdated; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FaithPoints other)) return false;
        return userId != null && userId.equals(other.userId);
    }

    @Override
    public int hashCode() { return userId != null ? userId.hashCode() : 0; }

    @Override
    public String toString() {
        return "FaithPoints{userId=" + userId + ", totalPoints=" + totalPoints
             + ", currentLevel=" + currentLevel + "}";
    }
}
