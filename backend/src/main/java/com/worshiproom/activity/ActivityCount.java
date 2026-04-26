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
 * Per-user activity counter with composite key {@code (user_id, count_type)}.
 *
 * <p>Maps to the {@code activity_counts} table created by Spec 2.1's Liquibase
 * changeset {@code 2026-04-25-007-create-activity-counts-table.xml}. The named
 * CHECK constraint {@code activity_counts_count_value_nonneg_check} enforces
 * {@code count_value >= 0} at the DB level; {@link Min}{@code (0)} mirrors
 * it at the application layer.
 *
 * <p>Composite key declared via {@link IdClass}({@link ActivityCountId}).
 * Both {@code @Id}-tagged fields here MUST match {@code ActivityCountId}'s
 * field names and types exactly.
 *
 * <p>{@code countType} is the wire-format string (e.g., {@code "prayerWall"}),
 * NOT the {@link CountType} enum value. Spec 2.5 Architectural Decision #2
 * has the service layer convert {@code CountType.X.wireValue()} →
 * {@code String} before persistence calls.
 *
 * <p>The {@code user_id} foreign key references {@code users.id} with
 * {@code ON DELETE CASCADE} per the changeset; that cascade is owned by
 * the DB, not by this entity.
 *
 * <p>Style mirrors {@link UserBadge}: manual getters/setters, no Lombok,
 * equals/hashCode by primary key (the composite of userId + countType).
 *
 * <p>Mostly used by the repository's UPSERT path, which writes via
 * {@code @Modifying} native query and never instantiates this entity.
 * The constructor + setters exist for {@link ActivityCountsService#getCount}
 * (which uses {@link org.springframework.data.jpa.repository.JpaRepository#findById}
 * to read rows) and for {@link ActivityCountsService#getAllCounts}
 * (which reads via {@link ActivityCountsRepository#findAllByUserId}).
 */
@Entity
@Table(name = "activity_counts")
@IdClass(ActivityCountId.class)
public class ActivityCount {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Id
    @Column(name = "count_type", nullable = false, updatable = false, length = 50)
    private String countType;

    @Min(0)
    @Column(name = "count_value", nullable = false)
    private int countValue = 0;

    @Column(name = "last_updated", nullable = false)
    private OffsetDateTime lastUpdated;

    protected ActivityCount() {}

    public ActivityCount(UUID userId, String countType) {
        this.userId = userId;
        this.countType = countType;
        this.lastUpdated = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public UUID getUserId() { return userId; }
    public String getCountType() { return countType; }
    public int getCountValue() { return countValue; }
    public OffsetDateTime getLastUpdated() { return lastUpdated; }

    public void setCountValue(int countValue) { this.countValue = countValue; }
    public void setLastUpdated(OffsetDateTime lastUpdated) { this.lastUpdated = lastUpdated; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ActivityCount other)) return false;
        return Objects.equals(userId, other.userId) && Objects.equals(countType, other.countType);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, countType);
    }

    @Override
    public String toString() {
        return "ActivityCount{userId=" + userId
             + ", countType='" + countType + "'"
             + ", countValue=" + countValue
             + ", lastUpdated=" + lastUpdated + "}";
    }
}
